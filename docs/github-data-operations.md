# GitHub 热门项目数据管理指南

本文档说明如何将 GitHub 热门项目信息写入数据库、如何管理版本记录，以及如何通过 API 或直接操作数据库完成这些任务。

---

## 目录

1. [数据模型](#1-数据模型)
2. [获取 GitHub 热门项目](#2-获取-github-热门项目)
3. [项目信息写入数据库](#3-项目信息写入数据库)
4. [版本信息写入数据库](#4-版本信息写入数据库)
5. [更新版本信息](#5-更新版本信息)
6. [直接操作数据库](#6-直接操作数据库)

---

## 1. 数据模型

### projects 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | Int (自增) | 主键 |
| `icon` | String | 图标标识，如 `TS`、`PY`、`GH` |
| `name` | String | 项目名，GitHub 仓库格式：`owner/repo` |
| `slug` | String? (唯一) | URL 友好标识，如 `vercel-next.js` |
| `latest_version` | String | 最新版本号，如 `v15.2.0` |
| `latest_update_time` | DateTime | 最新版本发布时间 |
| `describe` | Text? | 详细描述（来自 GitHub repo description） |
| `summar` | Text? | 简短摘要（通常与 describe 相同） |
| `author` | String? | 作者/组织，如 `vercel` |
| `type` | String? | 语言/分类，如 `TypeScript` |

### versions 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | Int (自增) | 主键 |
| `project_id` | Int | 关联 projects.id |
| `version` | String | 版本号，如 `v15.2.0` |
| `update_time` | DateTime | 发布时间 |
| `content` | Text | 更新日志（Markdown 格式） |
| `download_url` | String | 下载链接 |

---

## 2. 获取 GitHub 热门项目

### 2.1 自动抓取（推荐）

后端服务启动后 **60 秒**自动执行第一次，之后**每 6 小时**自动跑一次。

抓取逻辑：
1. 调用 GitHub Search API，筛选最近 7 天内有推送、stars > 100 的仓库
2. 按热度排序，默认取前 25 个
3. 对每个仓库抓取最近 10 条 release 写入 versions 表
4. 自动补全项目的 describe / author / type / icon 字段

如需配置 GitHub Token（提高 API 速率限制），在 `.env` 添加：

```
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

---

### 2.2 手动触发（API）

**立即执行一次（使用当前默认配置）：**

```bash
POST http://localhost:3000/api/scrape/github/trending
Content-Type: application/json

{}
```

**按语言筛选，只抓 TypeScript 项目：**

```bash
POST http://localhost:3000/api/scrape/github/trending
Content-Type: application/json

{
  "language": "TypeScript",
  "since": "weekly",
  "per_page": 20,
  "limit_per_repo": 5
}
```

**参数说明：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `language` | string | `""` | 筛选语言，如 `Python`、`Rust`、`Go` |
| `since` | string | `"weekly"` | 时间范围：`daily` / `weekly` / `monthly` |
| `per_page` | number | `25` | 返回的热门仓库数量（最大 30） |
| `limit_per_repo` | number | `10` | 每个仓库最多抓取的 release 数量 |
| `run_now` | boolean | `true` | 是否立即执行 |

**修改定时计划（改为每 2 小时执行一次）：**

```bash
POST http://localhost:3000/api/scrape/github/trending
Content-Type: application/json

{
  "set_schedule": true,
  "interval_minutes": 120,
  "run_now": false
}
```

**查看当前计划状态：**

```bash
GET http://localhost:3000/api/scrape/github/trending
```

返回示例：

```json
{
  "success": true,
  "schedule": {
    "enabled": true,
    "language": "",
    "since": "weekly",
    "per_page": 25,
    "limit_per_repo": 10,
    "interval_minutes": 360,
    "last_run_at": "2026-02-24T08:00:00.000Z",
    "last_error": null,
    "running": false
  }
}
```

---

### 2.3 手动指定仓库抓取

如果想抓取特定 GitHub 仓库（不走热门筛选），可以直接指定仓库列表：

```bash
POST http://localhost:3000/api/scrape/github
Content-Type: application/json

{
  "repos": [
    "vercel/next.js",
    "microsoft/vscode",
    "facebook/react"
  ],
  "include_prerelease": false,
  "limit_per_repo": 10
}
```

---

## 3. 项目信息写入数据库

### 3.1 通过 API 创建项目

```bash
POST http://localhost:3000/api/projects
Content-Type: application/json

{
  "icon": "TS",
  "name": "vercel/next.js",
  "slug": "vercel-nextjs",
  "latest_version": "v15.2.0",
  "latest_update_time": "2026-02-20T10:00:00.000Z",
  "describe": "The React Framework for the Web",
  "summar": "The React Framework for the Web",
  "author": "vercel",
  "type": "TypeScript"
}
```

**字段说明：**

- `icon`：2-3 个大写字母，如语言缩写 `TS`（TypeScript）、`PY`（Python）、`GO`、`RS`（Rust）、`GH`（通用 GitHub）
- `name`：建议使用 `owner/repo` 格式，保持唯一性
- `slug`：URL 手动指定时使用小写加连字符，若留空则自动从 name 生成
- `latest_version`：必须以 `v` 开头，如 `v1.0.0`
- `latest_update_time`：ISO 8601 格式时间字符串

**成功响应（201）：**

```json
{
  "id": 42,
  "icon": "TS",
  "name": "vercel/next.js",
  "slug": "vercel-nextjs",
  "latest_version": "v15.2.0",
  "latest_update_time": "2026-02-20T10:00:00.000Z",
  "describe": "The React Framework for the Web",
  "summar": "The React Framework for the Web",
  "author": "vercel",
  "type": "TypeScript"
}
```

**常见错误：**

- `400 Slug already exists`：该 slug 已被占用，换一个或不传（自动生成）

---

### 3.2 查询项目列表

```bash
# 分页查询，每页 10 条
GET http://localhost:3000/api/projects?page=1&per_page=10

# 查询单个项目（支持 id 或 slug）
GET http://localhost:3000/api/projects/42
GET http://localhost:3000/api/projects/vercel-nextjs
```

---

### 3.3 更新项目信息

```bash
PUT http://localhost:3000/api/projects/42
Content-Type: application/json

{
  "icon": "TS",
  "name": "vercel/next.js",
  "latest_version": "v15.3.0",
  "latest_update_time": "2026-02-24T12:00:00.000Z",
  "describe": "The React Framework – updated description",
  "summar": "React Framework",
  "author": "vercel",
  "type": "TypeScript"
}
```

> `id` 在路径里传，body 里不需要传 `id`。

---

## 4. 版本信息写入数据库

### 4.1 通过 API 新增版本

```bash
POST http://localhost:3000/api/versions
Content-Type: application/json

{
  "project_id": 42,
  "version": "v15.3.0",
  "update_time": "2026-02-24T12:00:00.000Z",
  "content": "## What's New\n\n- 新增 Turbopack 稳定版支持\n- 修复 SSR 缓存问题\n- 性能优化：冷启动时间减少 40%",
  "download_url": "https://github.com/vercel/next.js/archive/refs/tags/v15.3.0.zip"
}
```

**字段说明：**

- `project_id`：对应 projects 表的 id
- `version`：版本号，建议 `v` 开头
- `update_time`：ISO 8601 格式
- `content`：更新日志，支持 **Markdown** 格式，富文本内容
- `download_url`：下载链接，通常为 GitHub release zipball URL

**注意**：新增版本后，如果该版本比项目当前 `latest_version` 更新，前端会自动以最新版本显示。若需要同步 projects 表的 `latest_version` 字段，建议同时调用 `PUT /api/projects/{id}` 更新。

---

### 4.2 批量写入版本（使用爬虫 API）

对于已存在于数据库的项目，可以触发爬虫重新拉取所有 release：

```bash
POST http://localhost:3000/api/scrape/github
Content-Type: application/json

{
  "repos": ["vercel/next.js"],
  "include_prerelease": false,
  "limit_per_repo": 50
}
```

爬虫会自动**跳过已存在的版本**，只插入新版本，安全可重复执行。

---

## 5. 更新版本信息

### 5.1 通过 API 更新

```bash
PUT http://localhost:3000/api/versions/123
Content-Type: application/json

{
  "version": "v15.3.0",
  "update_time": "2026-02-24T12:00:00.000Z",
  "content": "## What's New\n\n（更新后的日志内容）",
  "download_url": "https://github.com/vercel/next.js/archive/refs/tags/v15.3.0.zip"
}
```

更新版本时，系统会自动检查：若该版本时间比项目的 `latest_update_time` 更新，则同步更新 projects 表里的 `latest_version` 和 `latest_update_time`。

### 5.2 删除版本

```bash
DELETE http://localhost:3000/api/versions/123
```

### 5.3 删除项目（级联删除所有版本）

```bash
DELETE http://localhost:3000/api/projects/42
```

---

## 6. 直接操作数据库

适合批量导入、数据修复等场景。

### 6.1 Prisma Studio（可视化）

```bash
# 在项目根目录执行
npx prisma studio
```

浏览器打开 `http://localhost:5555`，可以直接增删改查 projects 和 versions 表。

---

### 6.2 直接 SQL

连接到 Supabase PostgreSQL 后执行：

**插入项目：**

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

**插入版本：**

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

**批量从 GitHub Releases 同步（更新已有项目的最新版本）：**

```sql
-- 查看某项目当前所有版本
SELECT id, version, update_time FROM versions
WHERE project_id = 42
ORDER BY update_time DESC;

-- 更新项目的最新版本指针
UPDATE projects
SET latest_version = 'v15.3.0',
    latest_update_time = '2026-02-24 12:00:00+00',
    updated_at = NOW()
WHERE id = 42;
```

---

### 6.3 使用 Prisma Client 脚本

在项目根目录新建脚本文件，直接调用 Prisma：

```javascript
// scripts/seed-project.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 创建项目
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

  // 添加版本（重复执行安全）
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

---

## 附录：API 速查表

| 操作 | 方法 | 路径 |
|------|------|------|
| 获取热门项目（自动抓取状态） | GET | `/api/scrape/github/trending` |
| 触发一次热门项目抓取 | POST | `/api/scrape/github/trending` |
| 抓取指定仓库 | POST | `/api/scrape/github` |
| 查询项目列表 | GET | `/api/projects?page=1&per_page=10` |
| 查询单个项目（含版本） | GET | `/api/projects/{id 或 slug}` |
| 创建项目 | POST | `/api/projects` |
| 更新项目 | PUT | `/api/projects/{id}` |
| 删除项目 | DELETE | `/api/projects/{id}` |
| 新增版本 | POST | `/api/versions` |
| 更新版本 | PUT | `/api/versions/{id}` |
| 删除版本 | DELETE | `/api/versions/{id}` |
