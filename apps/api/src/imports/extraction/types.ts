import type { bookingTypeEnum } from '../../db/schema';

export type Confidence = 'high' | 'medium' | 'check';
export type BookingType = (typeof bookingTypeEnum.enumValues)[number];

/** One booking found in a document. Times are local, "2026-11-12T08:40". */
export interface ExtractedBooking {
  type: BookingType;
  title: string;
  provider: string;
  startAt: string;
  endAt: string | null;
  location: string;
  ref: string;
  priceCents: number | null;
  currency: string | null;
  guests: number | null;
  freeCancellationUntil: string | null;
  checkInOpens: string | null;
  /** how sure the reader is about each field; anything not "high" gets a "Please check" in the app */
  confidence: Partial<
    Record<keyof Omit<ExtractedBooking, 'confidence'>, Confidence>
  >;
}

export interface ExtractionInput {
  /** text of the email or document (may be empty for scans and photos) */
  text: string;
  /** the original file, for readers that can look at PDFs and images themselves */
  file?: { data: Buffer; mimeType: string };
  /** e.g. the email subject and sender */
  hint?: string;
}

export interface ExtractionProvider {
  readonly name: string;
  extract(input: ExtractionInput): Promise<ExtractedBooking[]>;
}

export const EXTRACTION_PROVIDER = Symbol('EXTRACTION_PROVIDER');
