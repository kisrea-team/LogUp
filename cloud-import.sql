CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE IF NOT EXISTS "projects" (
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

CREATE TABLE IF NOT EXISTS "versions" (
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

CREATE TABLE IF NOT EXISTS "rsshub_sources" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "projects_slug_key" ON "projects"("slug");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'versions_project_id_fkey'
    ) THEN
        ALTER TABLE "versions"
        ADD CONSTRAINT "versions_project_id_fkey"
        FOREIGN KEY ("project_id") REFERENCES "projects"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

INSERT INTO "projects" ("id","icon","name","slug","latest_version","latest_update_time","describe","summar","author","type","created_at","updated_at")
VALUES
    (1,'GH','vercel/next.js','nextjs','v15.1.0','2026-02-10 12:00:00','Next.js framework release notes','Next.js framework release notes','vercel','TypeScript','2026-02-10 12:00:00','2026-02-10 12:00:00'),
    (2,'GH','facebook/react','react','v19.0.0','2026-02-08 09:30:00','React release notes','React release notes','facebook','JavaScript','2026-02-08 09:30:00','2026-02-08 09:30:00'),
    (3,'GH','vuejs/core','vue','v3.5.0','2026-02-06 18:15:00','Vue release notes','Vue release notes','vuejs','TypeScript','2026-02-06 18:15:00','2026-02-06 18:15:00'),
    (4,'GH','sveltejs/kit','sveltekit','v2.7.0','2026-02-05 08:00:00','SvelteKit release notes','SvelteKit release notes','sveltejs','TypeScript','2026-02-05 08:00:00','2026-02-05 08:00:00'),
    (5,'GH','denoland/deno','deno','v2.1.0','2026-02-03 20:45:00','Deno release notes','Deno release notes','denoland','Rust','2026-02-03 20:45:00','2026-02-03 20:45:00')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "versions" ("id","project_id","version","update_time","content","download_url","created_at","updated_at")
VALUES
    (101,1,'v15.1.0','2026-02-10 12:00:00','### v15.1.0\n\n- Performance improvements\n- Bug fixes','https://github.com/vercel/next.js/releases/tag/v15.1.0','2026-02-10 12:00:00','2026-02-10 12:00:00'),
    (102,1,'v15.0.3','2026-01-28 10:20:00','### v15.0.3\n\n- Security patches\n- Bug fixes','https://github.com/vercel/next.js/releases/tag/v15.0.3','2026-01-28 10:20:00','2026-01-28 10:20:00'),
    (103,1,'v15.0.0','2026-01-12 16:00:00','### v15.0.0\n\n- Major release\n- New features','https://github.com/vercel/next.js/releases/tag/v15.0.0','2026-01-12 16:00:00','2026-01-12 16:00:00'),

    (201,2,'v19.0.0','2026-02-08 09:30:00','### v19.0.0\n\n- Major release','https://github.com/facebook/react/releases/tag/v19.0.0','2026-02-08 09:30:00','2026-02-08 09:30:00'),
    (202,2,'v18.3.1','2026-01-20 11:10:00','### v18.3.1\n\n- Bug fixes','https://github.com/facebook/react/releases/tag/v18.3.1','2026-01-20 11:10:00','2026-01-20 11:10:00'),
    (203,2,'v18.3.0','2026-01-05 14:00:00','### v18.3.0\n\n- Minor release','https://github.com/facebook/react/releases/tag/v18.3.0','2026-01-05 14:00:00','2026-01-05 14:00:00'),

    (301,3,'v3.5.0','2026-02-06 18:15:00','### v3.5.0\n\n- Performance improvements','https://github.com/vuejs/core/releases/tag/v3.5.0','2026-02-06 18:15:00','2026-02-06 18:15:00'),
    (302,3,'v3.4.27','2026-01-22 08:40:00','### v3.4.27\n\n- Bug fixes','https://github.com/vuejs/core/releases/tag/v3.4.27','2026-01-22 08:40:00','2026-01-22 08:40:00'),
    (303,3,'v3.4.0','2026-01-02 13:05:00','### v3.4.0\n\n- Minor release','https://github.com/vuejs/core/releases/tag/v3.4.0','2026-01-02 13:05:00','2026-01-02 13:05:00'),

    (401,4,'v2.7.0','2026-02-05 08:00:00','### v2.7.0\n\n- New features','https://github.com/sveltejs/kit/releases/tag/v2.7.0','2026-02-05 08:00:00','2026-02-05 08:00:00'),
    (402,4,'v2.6.1','2026-01-18 10:10:00','### v2.6.1\n\n- Bug fixes','https://github.com/sveltejs/kit/releases/tag/v2.6.1','2026-01-18 10:10:00','2026-01-18 10:10:00'),
    (403,4,'v2.6.0','2025-12-29 17:30:00','### v2.6.0\n\n- Minor release','https://github.com/sveltejs/kit/releases/tag/v2.6.0','2025-12-29 17:30:00','2025-12-29 17:30:00'),

    (501,5,'v2.1.0','2026-02-03 20:45:00','### v2.1.0\n\n- New features','https://github.com/denoland/deno/releases/tag/v2.1.0','2026-02-03 20:45:00','2026-02-03 20:45:00'),
    (502,5,'v2.0.6','2026-01-16 09:00:00','### v2.0.6\n\n- Bug fixes','https://github.com/denoland/deno/releases/tag/v2.0.6','2026-01-16 09:00:00','2026-01-16 09:00:00'),
    (503,5,'v2.0.0','2025-12-20 12:00:00','### v2.0.0\n\n- Major release','https://github.com/denoland/deno/releases/tag/v2.0.0','2025-12-20 12:00:00','2025-12-20 12:00:00')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "rsshub_sources" ("id","name","project_ref","base_url","route_prefix","suffix","enabled","interval_minutes","last_run_at","created_at","updated_at")
VALUES
    (1,'Next.js Releases','1','http://127.0.0.1:1200','/github/releases','vercel/next.js',true,60,NULL,'2026-02-10 12:05:00','2026-02-10 12:05:00'),
    (2,'React Releases','2','http://127.0.0.1:1200','/github/releases','facebook/react',true,120,NULL,'2026-02-08 09:35:00','2026-02-08 09:35:00'),
    (3,'Vue Releases','3','http://127.0.0.1:1200','/github/releases','vuejs/core',true,180,NULL,'2026-02-06 18:20:00','2026-02-06 18:20:00')
ON CONFLICT ("id") DO NOTHING;

SELECT setval(pg_get_serial_sequence('projects','id'), COALESCE((SELECT MAX(id) FROM "projects"), 1), true);
SELECT setval(pg_get_serial_sequence('versions','id'), COALESCE((SELECT MAX(id) FROM "versions"), 1), true);
SELECT setval(pg_get_serial_sequence('rsshub_sources','id'), COALESCE((SELECT MAX(id) FROM "rsshub_sources"), 1), true);
