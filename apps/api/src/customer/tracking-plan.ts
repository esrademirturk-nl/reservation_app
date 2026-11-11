/**
 * Tracking plan: every event Waypad records, with a schema for its properties.
 * Properties never contain names, emails, booking references or free text.
 * Change a schema in a breaking way → bump its version (docs/DATA-ARCHITECTURE.md §4.3).
 */
import { z } from 'zod';

const bookingType = z.enum([
  'flight',
  'hotel',
  'train',
  'museum',
  'restaurant',
  'tour',
]);
const language = z.enum(['en', 'tr', 'nl']);
const count = z.number().int().min(0).max(100_000);

export const TRACKING_PLAN = {
  // recorded by the API
  account_created: {
    origin: 'server',
    version: 1,
    schema: z.object({ language }),
  },
  onboarding_completed: {
    origin: 'server',
    version: 1,
    schema: z.object({
      interests_count: count,
      pace: z.string().nullable(),
      travel_party: z.string().nullable(),
      budget_level: z.number().int(),
    }),
  },
  trip_created: {
    origin: 'server',
    version: 1,
    schema: z.object({
      city: z.string(),
      country_code: z.string().length(2),
      nights: count,
      travelers: count,
      days_until_start: z.number().int(),
    }),
  },
  booking_added_manually: {
    origin: 'server',
    version: 1,
    schema: z.object({ type: bookingType, matched_trip: z.boolean() }),
  },
  booking_imported: {
    origin: 'server',
    version: 1,
    schema: z.object({
      type: bookingType,
      source: z.enum(['pdf', 'email', 'manual']),
      reader: z.string(),
      fields_flagged: count,
      matched_trip: z.boolean(),
    }),
  },
  booking_field_corrected: {
    origin: 'server',
    version: 1,
    schema: z.object({
      type: bookingType,
      field: z.string(),
      source: z.string(),
    }),
  },
  booking_confirmed: {
    origin: 'server',
    version: 1,
    schema: z.object({
      type: bookingType,
      source: z.string(),
      minutes_since_import: count,
    }),
  },
  suggestion_feedback: {
    origin: 'server',
    version: 1,
    schema: z.object({
      action: z.enum(['shown', 'accepted', 'dismissed', 'not_for_me']),
      section: z.string().max(40),
      item_kind: z.enum(['place', 'gap']),
      rank_position: count.optional(),
    }),
  },
  // sent by the apps through POST /events
  screen_viewed: {
    origin: 'client',
    version: 1,
    schema: z.object({ screen: z.string().max(40) }),
  },
  gap_shown: {
    origin: 'client',
    version: 1,
    schema: z.object({
      kind: z.enum(['stay', 'transport']),
      days_before_trip: z.number().int(),
    }),
  },
  audio_guide_played: {
    origin: 'client',
    version: 1,
    schema: z.object({
      place_id: z.uuid(),
      language,
      seconds_listened: count,
      fallback: z.boolean(),
    }),
  },
  search_performed: {
    origin: 'client',
    version: 1,
    schema: z.object({
      screen: z.string().max(40),
      query_length: count,
      results: count,
    }),
  },
  reminder_opened: {
    origin: 'client',
    version: 1,
    schema: z.object({ kind: z.enum(['check_in', 'free_cancellation']) }),
  },
} as const;

export type EventName = keyof typeof TRACKING_PLAN;
export type EventProps<N extends EventName> = z.input<
  (typeof TRACKING_PLAN)[N]['schema']
>;
export const CLIENT_EVENTS = (Object.keys(TRACKING_PLAN) as EventName[]).filter(
  (n) => TRACKING_PLAN[n].origin === 'client',
);
