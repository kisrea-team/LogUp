-- AlterTable
ALTER TABLE "ai_providers" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'translate';
ALTER TABLE "ai_providers" ADD COLUMN "router_role" TEXT;
