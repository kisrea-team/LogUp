-- Add links column to projects table
ALTER TABLE "projects" ADD COLUMN "links" JSONB NOT NULL DEFAULT '[]'::jsonb;
