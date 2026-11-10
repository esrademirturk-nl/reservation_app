import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { bookingTypeEnum } from '../../db/schema';
import type {
  ExtractedBooking,
  ExtractionInput,
  ExtractionProvider,
} from './types';

const LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** What we ask Claude to return, checked again with zod before anything is saved. */
const bookingSchema = z.object({
  type: z.enum(bookingTypeEnum.enumValues),
  title: z.string().min(1).max(200),
  provider: z.string().min(1).max(120),
  startAt: z.string().regex(LOCAL),
  endAt: z.string().regex(LOCAL).nullable(),
  location: z.string().max(300),
  ref: z.string().max(64),
  priceCents: z.number().int().nonnegative().nullable(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
  guests: z.number().int().positive().max(50).nullable(),
  freeCancellationUntil: z.string().regex(DATE).nullable(),
  checkInOpens: z.string().regex(DATE).nullable(),
  uncertainFields: z.array(z.string()).default([]),
});
const resultSchema = z.object({ bookings: z.array(z.unknown()) });

const TOOL: Anthropic.Tool = {
  name: 'save_bookings',
  description: 'Save every travel booking found in the document.',
  input_schema: {
    type: 'object',
    required: ['bookings'],
    properties: {
      bookings: {
        type: 'array',
        items: {
          type: 'object',
          required: [
            'type',
            'title',
            'provider',
            'startAt',
            'endAt',
            'location',
            'ref',
            'priceCents',
            'currency',
            'guests',
            'freeCancellationUntil',
            'checkInOpens',
            'uncertainFields',
          ],
          properties: {
            type: { type: 'string', enum: [...bookingTypeEnum.enumValues] },
            title: {
              type: 'string',
              description:
                'Short title as a traveller would say it, e.g. "KLM · AMS → FCO" or "Hotel Roma Centro"',
            },
            provider: {
              type: 'string',
              description: 'Airline, hotel chain, booking site or venue',
            },
            startAt: {
              type: 'string',
              description:
                'Local time at the place, YYYY-MM-DDTHH:mm (departure, check-in, visit time)',
            },
            endAt: {
              type: ['string', 'null'],
              description:
                'Local time, YYYY-MM-DDTHH:mm (arrival, check-out) or null',
            },
            location: {
              type: 'string',
              description:
                'Address, station or airports; empty string if unknown',
            },
            ref: {
              type: 'string',
              description:
                'Booking reference / PNR / confirmation number; empty string if none',
            },
            priceCents: {
              type: ['integer', 'null'],
              description: 'Total price in cents',
            },
            currency: {
              type: ['string', 'null'],
              description: 'ISO 4217 code',
            },
            guests: { type: ['integer', 'null'] },
            freeCancellationUntil: {
              type: ['string', 'null'],
              description: 'YYYY-MM-DD',
            },
            checkInOpens: {
              type: ['string', 'null'],
              description: 'YYYY-MM-DD, flights only',
            },
            uncertainFields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Names of fields you guessed or could not find',
            },
          },
        },
      },
    },
  },
};

const INSTRUCTIONS = `You read travel booking confirmations (flights, hotels, trains, museum and attraction tickets, restaurants, tours).
Call save_bookings with every booking in the document. A round-trip flight is two bookings with the same reference.
Times are the local times printed on the document — never convert time zones. Do not invent values:
use null or an empty string and list the field in uncertainFields when it is missing or you are unsure.
If the document contains no booking, call save_bookings with an empty list.`;

type Client = Pick<Anthropic, 'messages'>;

export class ClaudeExtractor implements ExtractionProvider {
  readonly name = 'claude';
  constructor(
    private readonly client: Client,
    private readonly model: string,
  ) {}

  async extract(input: ExtractionInput): Promise<ExtractedBooking[]> {
    const content: Anthropic.ContentBlockParam[] = [];
    const hasText = input.text.trim().length > 40;
    if (!hasText && input.file?.mimeType === 'application/pdf')
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: input.file.data.toString('base64'),
        },
      });
    if (
      !hasText &&
      input.file &&
      /^image\/(png|jpeg|webp|gif)$/.test(input.file.mimeType)
    )
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: input.file.mimeType as 'image/png',
          data: input.file.data.toString('base64'),
        },
      });
    content.push({
      type: 'text',
      text:
        `${input.hint ? `${input.hint}\n\n` : ''}${input.text.slice(0, 60_000)}`.trim() ||
        '(see attachment)',
    });

    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: INSTRUCTIONS,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: TOOL.name },
      messages: [{ role: 'user', content }],
    });
    const call = res.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );
    if (!call) return [];
    const parsed = resultSchema.safeParse(call.input);
    if (!parsed.success) return [];

    // keep only bookings that pass validation; mark uncertain fields for "Please check"
    return parsed.data.bookings.flatMap((raw) => {
      const b = bookingSchema.safeParse(raw);
      if (!b.success) return [];
      const { uncertainFields, ...booking } = b.data;
      const confidence: ExtractedBooking['confidence'] = {};
      for (const k of Object.keys(booking) as (keyof typeof booking)[])
        confidence[k] = uncertainFields.includes(k)
          ? 'check'
          : booking[k] === null || booking[k] === ''
            ? 'check'
            : 'high';
      return [{ ...booking, confidence }];
    });
  }
}
