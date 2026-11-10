CREATE TYPE "public"."narration_source" AS ENUM('curated', 'ai');--> statement-breakpoint
CREATE TYPE "public"."place_category" AS ENUM('sight', 'museum', 'food', 'coffee', 'walk');--> statement-breakpoint
CREATE TABLE "place_narrations" (
	"place_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"text" text NOT NULL,
	"seconds" smallint NOT NULL,
	"source" "narration_source" DEFAULT 'curated' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_narrations_place_id_language_pk" PRIMARY KEY("place_id","language")
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" integer NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"category" "place_category" NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"lat" real NOT NULL,
	"lon" real NOT NULL,
	"photo_url" text,
	"photo_credit" text,
	"hours" text,
	"hours_note" text,
	"visit_minutes" smallint DEFAULT 60 NOT NULL,
	"price_level" smallint,
	"rank" smallint DEFAULT 100 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_items" ADD COLUMN "place_id" uuid;--> statement-breakpoint
ALTER TABLE "place_narrations" ADD CONSTRAINT "place_narrations_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "places_city_slug_uq" ON "places" USING btree ("city_id","slug");--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;