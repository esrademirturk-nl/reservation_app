/**
 * Waypad database schema (Drizzle ORM, PostgreSQL).
 * Mirrors the data model in docs/DATA-MODEL.md and the Technical Design Document.
 *
 * Conventions
 * - UUID primary keys (cities use a small serial id).
 * - snake_case column names, camelCase in TypeScript.
 * - User-owned tables have `deletedAt` for soft delete.
 * - Values that can be computed (readiness, gaps, deadlines, totals) are never stored.
 */
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/* ---------- enums ---------- */
export const languageEnum = pgEnum('language', ['en', 'tr', 'nl']);
export const tripRoleEnum = pgEnum('trip_role', ['owner', 'editor', 'viewer']);
export const bookingTypeEnum = pgEnum('booking_type', [
  'flight',
  'hotel',
  'train',
  'museum',
  'restaurant',
  'tour',
]);
export const bookingSourceEnum = pgEnum('booking_source', [
  'booking_com',
  'email',
  'pdf',
  'manual',
]);
export const reservationStatusEnum = pgEnum('reservation_status', [
  'pending',
  'confirmed',
  'cancelled',
]);
export const documentKindEnum = pgEnum('document_kind', [
  'email_body',
  'email_attachment',
  'upload',
]);
export const documentStatusEnum = pgEnum('document_status', [
  'processing',
  'parsed',
  'failed',
]);
export const planItemKindEnum = pgEnum('plan_item_kind', [
  'booked',
  'planned',
  'suggested',
  'kept',
  'free',
]);

const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const deletedAt = () => timestamp('deleted_at', { withTimezone: true });

/* ---------- users ---------- */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  /** null until the user sets a password (auth arrives in milestone 2) */
  passwordHash: text('password_hash'),
  fullName: text('full_name').notNull(),
  language: languageEnum('language').notNull().default('en'),
  /** 1 = €, 2 = €€, 3 = €€€ */
  budgetLevel: smallint('budget_level').notNull().default(2),
  /** local part of the personal forwarding address, e.g. "esra" → esra@in.waypad.app */
  forwardAlias: varchar('forward_alias', { length: 64 }).notNull().unique(),
  homeCity: text('home_city'),
  createdAt: createdAt(),
  deletedAt: deletedAt(),
});

/** Extra addresses a user may forward bookings from (verified by a code). */
export const verifiedSenders = pgTable(
  'verified_senders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 320 }).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('verified_senders_user_email_uq').on(t.userId, t.email)],
);

/**
 * Refresh tokens are random strings; only their SHA-256 hash is stored.
 * Each refresh rotates the token. Using an already-rotated token revokes the whole family
 * (a sign that the token was stolen).
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('refresh_tokens_family_idx').on(t.familyId)],
);

/* ---------- places ---------- */
export const cities = pgTable(
  'cities',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    countryCode: varchar('country_code', { length: 2 }).notNull(),
    country: text('country').notNull(),
    lat: real('lat').notNull(),
    lon: real('lon').notNull(),
    /** Near me and the audio guide are only switched on for selected cities */
    liveGuideEnabled: boolean('live_guide_enabled').notNull().default(false),
  },
  (t) => [uniqueIndex('cities_name_country_uq').on(t.name, t.countryCode)],
);

/* ---------- trips ---------- */
export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** human-readable key used by the web app (e.g. "rome"); unique per owner in practice */
    slug: varchar('slug', { length: 64 }).notNull(),
    cityId: integer('city_id')
      .notNull()
      .references(() => cities.id),
    startDate: date('start_date').notNull(),
    /** departure day; nights = end − start */
    endDate: date('end_date').notNull(),
    travelers: smallint('travelers').notNull().default(1),
    coverPhotoUrl: text('cover_photo_url'),
    coverPhotoCredit: text('cover_photo_credit'),
    createdAt: createdAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('trips_dates_idx').on(t.startDate, t.endDate)],
);

/** Access to a trip always goes through membership — sharing comes later without a migration. */
export const tripMembers = pgTable(
  'trip_members',
  {
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: tripRoleEnum('role').notNull().default('owner'),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.tripId, t.userId] })],
);

/* ---------- ingestion ---------- */
export const inboundEmails = pgTable('inbound_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  fromAddress: varchar('from_address', { length: 320 }).notNull(),
  subject: text('subject'),
  /** raw message lives in blob storage, never in the database */
  rawBlobPath: text('raw_blob_path').notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  /** raw content is deleted 30 days after receipt */
  purgeAt: timestamp('purge_at', { withTimezone: true })
    .notNull()
    .default(sql`now() + interval '30 days'`),
  /** false when the sender is not the user or a verified sender */
  accepted: boolean('accepted').notNull().default(true),
});

/** One unit to extract: an email body, an email attachment or an uploaded file. */
export const sourceDocuments = pgTable('source_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  inboundEmailId: uuid('inbound_email_id').references(() => inboundEmails.id, {
    onDelete: 'cascade',
  }),
  kind: documentKindEnum('kind').notNull(),
  fileName: text('file_name'),
  blobPath: text('blob_path').notNull(),
  status: documentStatusEnum('status').notNull().default('processing'),
  error: text('error'),
  createdAt: createdAt(),
});

/* ---------- reservations ---------- */
export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** null = Unsorted (no matching trip); a suggestion until the reservation is confirmed */
    tripId: uuid('trip_id').references(() => trips.id, {
      onDelete: 'set null',
    }),
    sourceDocumentId: uuid('source_document_id').references(
      () => sourceDocuments.id,
      { onDelete: 'set null' },
    ),
    type: bookingTypeEnum('type').notNull(),
    title: text('title').notNull(),
    provider: text('provider').notNull(),
    source: bookingSourceEnum('source').notNull(),
    /** local time at the destination, as printed on the ticket */
    startAt: timestamp('start_at', {
      withTimezone: false,
      mode: 'string',
    }).notNull(),
    endAt: timestamp('end_at', { withTimezone: false, mode: 'string' }),
    location: text('location').notNull().default(''),
    /** confirmation code; one PNR can cover several reservations (outbound + return) */
    ref: varchar('ref', { length: 64 }).notNull(),
    priceCents: integer('price_cents').notNull().default(0),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    paid: boolean('paid').notNull().default(false),
    status: reservationStatusEnum('status').notNull().default('pending'),
    freeCancellationUntil: date('free_cancellation_until'),
    checkInOpens: date('check_in_opens'),
    guests: smallint('guests').notNull().default(1),
    /** true only when a scannable pass (QR) exists right now */
    hasPass: boolean('has_pass').notNull().default(false),
    /** extraction confidence per field, e.g. { "endAt": "check", "location": "medium" } */
    fieldConfidence:
      jsonb('field_confidence').$type<
        Record<string, 'high' | 'medium' | 'check'>
      >(),
    createdAt: createdAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index('reservations_user_idx').on(t.userId),
    index('reservations_trip_idx').on(t.tripId),
    index('reservations_user_ref_idx').on(t.userId, t.ref),
  ],
);

/* ---------- day plans ---------- */
export const dayPlans = pgTable(
  'day_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    /** set when bookings changed after the plan was generated */
    needsUpdate: boolean('needs_update').notNull().default(false),
  },
  (t) => [uniqueIndex('day_plans_trip_date_uq').on(t.tripId, t.date)],
);

export const planItems = pgTable('plan_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  dayPlanId: uuid('day_plan_id')
    .notNull()
    .references(() => dayPlans.id, { onDelete: 'cascade' }),
  kind: planItemKindEnum('kind').notNull(),
  /** set for kind = booked */
  reservationId: uuid('reservation_id').references(() => reservations.id, {
    onDelete: 'cascade',
  }),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  startTime: time('start_time'),
  endTime: time('end_time'),
  position: smallint('position').notNull().default(0),
});

/* ---------- relations (for relational queries) ---------- */
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(tripMembers),
  reservations: many(reservations),
}));
export const tripsRelations = relations(trips, ({ one, many }) => ({
  city: one(cities, { fields: [trips.cityId], references: [cities.id] }),
  members: many(tripMembers),
  reservations: many(reservations),
  dayPlans: many(dayPlans),
}));
export const tripMembersRelations = relations(tripMembers, ({ one }) => ({
  trip: one(trips, { fields: [tripMembers.tripId], references: [trips.id] }),
  user: one(users, { fields: [tripMembers.userId], references: [users.id] }),
}));
export const reservationsRelations = relations(reservations, ({ one }) => ({
  trip: one(trips, { fields: [reservations.tripId], references: [trips.id] }),
  user: one(users, { fields: [reservations.userId], references: [users.id] }),
  sourceDocument: one(sourceDocuments, {
    fields: [reservations.sourceDocumentId],
    references: [sourceDocuments.id],
  }),
}));
export const dayPlansRelations = relations(dayPlans, ({ one, many }) => ({
  trip: one(trips, { fields: [dayPlans.tripId], references: [trips.id] }),
  items: many(planItems),
}));
export const planItemsRelations = relations(planItems, ({ one }) => ({
  dayPlan: one(dayPlans, {
    fields: [planItems.dayPlanId],
    references: [dayPlans.id],
  }),
  reservation: one(reservations, {
    fields: [planItems.reservationId],
    references: [reservations.id],
  }),
}));
