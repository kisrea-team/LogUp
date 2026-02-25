# Prisma 脚本示例

## 创建/更新项目及版本

```javascript
// scripts/seed-project.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 创建或更新项目
  const project = await prisma.project.upsert({
    where: { slug: 'vercel-nextjs' },
    update: { latest_version: 'v15.3.0', latest_update_time: new Date() },
    create: {
      icon: 'TS',
      name: 'vercel/next.js',
      slug: 'vercel-nextjs',
      latest_version: 'v15.3.0',
      latest_update_time: new Date(),
      describe: 'The React Framework for the Web',
      summar: 'The React Framework for the Web',
      author: 'vercel',
      type: 'TypeScript',
    },
  });
  console.log('Project:', project.id);

  // 添加版本（幂等）
  const existing = await prisma.version.findFirst({
    where: { project_id: project.id, version: 'v15.3.0' },
  });
  if (!existing) {
    await prisma.version.create({
      data: {
        project_id: project.id,
        version: 'v15.3.0',
        update_time: new Date(),
        content: '## Changelog\n\n- Feature A\n- Fix B',
        download_url: 'https://github.com/vercel/next.js/archive/refs/tags/v15.3.0.zip',
      },
    });
    console.log('Version created');
  }
}

main().finally(() => prisma.$disconnect());
```

执行：
```bash
node scripts/seed-project.js
```

## 直接 SQL 示例

### 插入项目

```sql
INSERT INTO projects (icon, name, slug, latest_version, latest_update_time, describe, summar, author, type, created_at, updated_at)
VALUES (
  'TS',
  'vercel/next.js',
  'vercel-nextjs',
  'v15.2.0',
  '2026-02-20 10:00:00+00',
  'The React Framework for the Web',
  'The React Framework for the Web',
  'vercel',
  'TypeScript',
  NOW(),
  NOW()
);
```

### 插入版本

```sql
INSERT INTO versions (project_id, version, update_time, content, download_url, created_at, updated_at)
VALUES (
  42,
  'v15.2.0',
  '2026-02-20 10:00:00+00',
  E'## What''s New\n\n- 新增功能\n- 修复问题',
  'https://github.com/vercel/next.js/archive/refs/tags/v15.2.0.zip',
  NOW(),
  NOW()
);
```

### 查询版本

```sql
SELECT id, version, update_time FROM versions
WHERE project_id = 42
ORDER BY update_time DESC;
```

### 更新最新版本

```sql
UPDATE projects
SET latest_version = 'v15.3.0',
    latest_update_time = '2026-02-24 12:00:00+00',
    updated_at = NOW()
WHERE id = 42;
```
