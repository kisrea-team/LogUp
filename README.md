---
title: Logup
emoji: 🔥
colorFrom: red
colorTo: pink
sdk: docker
sdk_version: "latest"
app_port: 7860
suggested_hardware: cpu-basic
suggested_storage: small
tags:
  - nextjs
  - prisma
  - postgresql
  - docker
pinned: false
---

# LogUp

软件版本更新追踪站点，收录各类软件项目的版本记录和更新日志，面向中文用户提供本地化内容。目标是成为工业级爬取系统，以程序化更新为主、AI 运营为辅。

## 技术栈

- **前端 + API**：Next.js 16 App Router（单进程），Tailwind CSS 4
- **数据库**：PostgreSQL + Prisma ORM
- **部署**：Docker，运行在 Hugging Face Spaces
- **自动运营**：GitHub Actions 定时触发，爬取、翻译、入库新项目和版本记录
- **更新检测**：ETag 探针和正则匹配，只对有变化的项目发起完整检查，降低无效请求
- **GitHub 爬取**：lib/github.ts 直连 GitHub API 抓取 releases/tags/trending 并入库
- **链接收录**：调用自部署的 DDGS Search API 查找中文社区资料，自动补充参考链接
- **SEO**：新增 URL 自动提交 Google Indexing API

## 目录结构

```
├── app/
│   ├── api/               # Next.js route handlers（含爬虫接口）
│   │   ├── projects/      # 项目 CRUD
│   │   ├── versions/      # 版本 CRUD
│   │   └── scrape/github/ # GitHub 爬取 / trending / schedule / fix-icons
│   ├── admin/             # 管理后台
│   └── project/[id]/      # 项目详情页
├── lib/
│   ├── prisma.ts          # Prisma 客户端
│   ├── github.ts          # GitHub 爬取核心逻辑
│   └── api.ts             # 前端 API 请求工具
├── components/            # UI 组件
├── scripts/               # 运营脚本（GitHub Actions 使用）
├── prisma/schema.prisma   # 数据模型
└── .github/workflows/     # 自动运营流水线
```

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，至少设置 DATABASE_URL（PostgreSQL）

# 3. 启动（自动同步 Prisma schema 并运行 Next.js dev）
npm run dev:all
```

或分开执行：

```bash
npx prisma db push   # 同步数据库 schema
npm run dev          # 启动 Next.js dev server
```

## 常用命令

```bash
npm run build        # 生产构建
npm run start        # 生产启动（standalone）
npm run lint         # ESLint
npm run db:studio    # Prisma Studio 可视化数据库
```

## 部署

支持 Docker 部署（单进程 Next.js standalone）：

```bash
docker build -t logup .
docker run -p 7860:7860 --env-file .env logup
```

## 自动运营

GitHub Actions 流水线（`.github/workflows/github-data-ops.yml`）定时执行：

1. **ETag 探针**：`scripts/check-updates.js` 并发探测各项目 update_source_url，标记有变化的项目
2. **GitHub 自动更新**：`scripts/process-github-updates.js` 用 GitHub API 比对最新版本并自动入库
3. **AI 运营编排**：对剩余非 GitHub 项目由 Claude Code 子代理（project-handler / nocache-inspector / project-onboarder）补全版本、正则、中文链接
4. **SEO 提交**：新增 URL 提交 Google Indexing API

详细的 GitHub 数据运营指南见 [docs/github-data-operations.md](docs/github-data-operations.md)。
