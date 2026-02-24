-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "icon" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "latest_version" TEXT NOT NULL,
    "latest_update_time" TIMESTAMP(3) NOT NULL,
    "describe" TEXT,
    "summar" TEXT,
    "author" TEXT,
    "type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versions" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "update_time" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "download_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rsshub_sources" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "project_ref" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "route_prefix" TEXT NOT NULL,
    "suffix" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "interval_minutes" INTEGER,
    "last_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rsshub_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- AddForeignKey
ALTER TABLE "versions" ADD CONSTRAINT "versions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
