ALTER TABLE "source_documents" ADD COLUMN "mime_type" varchar(100) DEFAULT 'application/octet-stream' NOT NULL;--> statement-breakpoint
ALTER TABLE "source_documents" ADD COLUMN "extractor" varchar(32);--> statement-breakpoint
ALTER TABLE "source_documents" ADD COLUMN "processed_at" timestamp with time zone;