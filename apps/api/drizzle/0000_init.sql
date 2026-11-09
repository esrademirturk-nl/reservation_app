CREATE TYPE "public"."booking_source" AS ENUM('booking_com', 'email', 'pdf', 'manual');--> statement-breakpoint
CREATE TYPE "public"."booking_type" AS ENUM('flight', 'hotel', 'train', 'museum', 'restaurant', 'tour');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('email_body', 'email_attachment', 'upload');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('processing', 'parsed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'tr', 'nl');--> statement-breakpoint
CREATE TYPE "public"."plan_item_kind" AS ENUM('booked', 'planned', 'suggested', 'kept', 'free');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."trip_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"country" text NOT NULL,
	"lat" real NOT NULL,
	"lon" real NOT NULL,
	"live_guide_enabled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "day_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"date" date NOT NULL,
	"needs_update" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbound_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_address" varchar(320) NOT NULL,
	"subject" text,
	"raw_blob_path" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"purge_at" timestamp with time zone DEFAULT now() + interval '30 days' NOT NULL,
	"accepted" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_plan_id" uuid NOT NULL,
	"kind" "plan_item_kind" NOT NULL,
	"reservation_id" uuid,
	"title" text NOT NULL,
	"subtitle" text,
	"start_time" time,
	"end_time" time,
	"position" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"trip_id" uuid,
	"source_document_id" uuid,
	"type" "booking_type" NOT NULL,
	"title" text NOT NULL,
	"provider" text NOT NULL,
	"source" "booking_source" NOT NULL,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp,
	"location" text DEFAULT '' NOT NULL,
	"ref" varchar(64) NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"status" "reservation_status" DEFAULT 'pending' NOT NULL,
	"free_cancellation_until" date,
	"check_in_opens" date,
	"guests" smallint DEFAULT 1 NOT NULL,
	"has_pass" boolean DEFAULT false NOT NULL,
	"field_confidence" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "source_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"inbound_email_id" uuid,
	"kind" "document_kind" NOT NULL,
	"file_name" text,
	"blob_path" text NOT NULL,
	"status" "document_status" DEFAULT 'processing' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_members" (
	"trip_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "trip_role" DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_members_trip_id_user_id_pk" PRIMARY KEY("trip_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"city_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"travelers" smallint DEFAULT 1 NOT NULL,
	"cover_photo_url" text,
	"cover_photo_credit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" text,
	"full_name" text NOT NULL,
	"language" "language" DEFAULT 'en' NOT NULL,
	"budget_level" smallint DEFAULT 2 NOT NULL,
	"forward_alias" varchar(64) NOT NULL,
	"home_city" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_forward_alias_unique" UNIQUE("forward_alias")
);
--> statement-breakpoint
CREATE TABLE "verified_senders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "day_plans" ADD CONSTRAINT "day_plans_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD CONSTRAINT "inbound_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_day_plan_id_day_plans_id_fk" FOREIGN KEY ("day_plan_id") REFERENCES "public"."day_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_inbound_email_id_inbound_emails_id_fk" FOREIGN KEY ("inbound_email_id") REFERENCES "public"."inbound_emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verified_senders" ADD CONSTRAINT "verified_senders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cities_name_country_uq" ON "cities" USING btree ("name","country_code");--> statement-breakpoint
CREATE UNIQUE INDEX "day_plans_trip_date_uq" ON "day_plans" USING btree ("trip_id","date");--> statement-breakpoint
CREATE INDEX "reservations_user_idx" ON "reservations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reservations_trip_idx" ON "reservations" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "reservations_user_ref_idx" ON "reservations" USING btree ("user_id","ref");--> statement-breakpoint
CREATE INDEX "trips_dates_idx" ON "trips" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "verified_senders_user_email_uq" ON "verified_senders" USING btree ("user_id","email");