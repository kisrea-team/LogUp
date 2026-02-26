-- Add update_source_url column for ETag-based change detection
ALTER TABLE "projects" ADD COLUMN "update_source_url" TEXT;
