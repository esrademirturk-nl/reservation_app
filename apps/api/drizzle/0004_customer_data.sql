CREATE TYPE "public"."consent_purpose" AS ENUM('product_analytics', 'personalisation', 'marketing', 'ai_processing');--> statement-breakpoint
CREATE TYPE "public"."suggestion_feedback_action" AS ENUM('shown', 'accepted', 'dismissed', 'not_for_me');--> statement-breakpoint
CREATE TYPE "public"."travel_pace" AS ENUM('relaxed', 'balanced', 'packed');--> statement-breakpoint
CREATE TYPE "public"."seat_preference" AS ENUM('window', 'aisle', 'none');--> statement-breakpoint
CREATE TYPE "public"."travel_party" AS ENUM('solo', 'couple', 'friends', 'family');--> statement-breakpoint
CREATE TABLE "customer_keys" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"customer_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_keys_customer_key_unique" UNIQUE("customer_key")
);
--> statement-breakpoint
CREATE TABLE "event_outbox" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_key" uuid NOT NULL,
	"event_name" varchar(64) NOT NULL,
	"schema_version" smallint DEFAULT 1 NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"shipped_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "suggestion_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"trip_id" uuid,
	"item_ref" varchar(100) NOT NULL,
	"action" "suggestion_feedback_action" NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "consent_purpose" NOT NULL,
	"granted" boolean NOT NULL,
	"text_version" varchar(32) NOT NULL,
	"source" varchar(32) NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_features" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"trips_per_year" numeric(6, 2),
	"avg_trip_nights" numeric(6, 2),
	"avg_spend_per_night_cents" integer,
	"median_lead_time_days" smallint,
	"top_categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"segment" varchar(40),
	"computed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"pace" "travel_pace",
	"interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"travel_party" "travel_party",
	"home_airport" varchar(3),
	"preferred_providers" text[] DEFAULT '{}'::text[] NOT NULL,
	"seat" "seat_preference",
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_keys" ADD CONSTRAINT "customer_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestion_feedback" ADD CONSTRAINT "suggestion_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestion_feedback" ADD CONSTRAINT "suggestion_feedback_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_features" ADD CONSTRAINT "user_features_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_outbox_unshipped_idx" ON "event_outbox" USING btree ("occurred_at") WHERE "event_outbox"."shipped_at" is null;--> statement-breakpoint
CREATE INDEX "suggestion_feedback_user_idx" ON "suggestion_feedback" USING btree ("user_id","action");--> statement-breakpoint
CREATE INDEX "user_consents_user_purpose_idx" ON "user_consents" USING btree ("user_id","purpose","recorded_at");