-- Add version_regex column for regex-based version extraction from no-cache update_source_url pages
ALTER TABLE "projects" ADD COLUMN "version_regex" TEXT;
