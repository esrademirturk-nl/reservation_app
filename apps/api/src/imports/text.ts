import { simpleParser } from 'mailparser';
import { extractText as pdfText, getDocumentProxy } from 'unpdf';

export const ACCEPTED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'text/html',
  'message/rfc822',
] as const;

/** Trust the bytes, not the file name: a "PDF" must start with %PDF, images with their magic numbers. */
export function sniffMimeType(
  data: Buffer,
  declared: string,
  fileName = '',
): string | null {
  const head = data.subarray(0, 12);
  if (head.subarray(0, 4).toString('latin1') === '%PDF')
    return 'application/pdf';
  if (head[0] === 0x89 && head.subarray(1, 4).toString('latin1') === 'PNG')
    return 'image/png';
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff)
    return 'image/jpeg';
  if (
    head.subarray(0, 4).toString('latin1') === 'RIFF' &&
    head.subarray(8, 12).toString('latin1') === 'WEBP'
  )
    return 'image/webp';
  // text formats: no magic number, so make sure it really is text
  if (data.subarray(0, 4096).includes(0)) return null;
  if (declared === 'message/rfc822' || /\.eml$/i.test(fileName))
    return 'message/rfc822';
  if (declared === 'text/html' || /\.html?$/i.test(fileName))
    return 'text/html';
  if (declared.startsWith('text/') || /\.txt$/i.test(fileName))
    return 'text/plain';
  return null;
}

export const htmlToText = (html: string) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&euro;/g, '€')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();

/** Plain text of a document. Empty for images and scanned PDFs (the AI reader looks at those itself). */
export async function documentText(
  data: Buffer,
  mimeType: string,
): Promise<string> {
  switch (mimeType) {
    case 'application/pdf': {
      const pdf = await getDocumentProxy(new Uint8Array(data));
      const { text } = await pdfText(pdf, { mergePages: true });
      return text;
    }
    case 'text/html':
      return htmlToText(data.toString('utf8'));
    case 'text/plain':
      return data.toString('utf8');
    case 'message/rfc822': {
      const mail = await simpleParser(data);
      const parts = [
        mail.subject ?? '',
        mail.text ?? (mail.html ? htmlToText(mail.html) : ''),
      ];
      for (const a of mail.attachments.filter(
        (x) => x.contentType === 'application/pdf',
      ))
        parts.push(await documentText(a.content, 'application/pdf'));
      return parts.join('\n');
    }
    default:
      return '';
  }
}
