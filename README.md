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
  - version-extractor
pinned: false
---

# LogUp

软件版本更新追踪站点，收录各类软件项目的版本记录和更新日志，面向中文用户提供本地化内容。**版本提取统一由 [version-extractor](https://github.com/kisrea-team/version-extractor) 爬虫引擎完成**（注册表 / GitHub API / LightGBM 排序 / LLM 兜底 / 浏览器渲染），本站在其之上做运营、展示与人工审核。

## 技术栈

- **前端 + API**：Next.js 16 App Router（单进程），Tailwind CSS 4
- **数据库**：PostgreSQL + Prisma ORM
- **部署**：Docker，运行在 Hugging Face Spaces
- **版本提取引擎**：[version-extractor](https://github.com/kisrea-team/version-extractor) 外部服务（`EXTRACTOR_URL`），负责抓页 + 候选收集 + LGB/LambdaRank 排序 + LLM 兜底 + 浏览器渲染 + 决策审计
- **版本更新**：后台按需"获取最新版本"（走 version-extractor）+ 全库 TTL 扫（`scripts/update-existing-projects.js`，只查超过 `CHECK_TTL_HOURS` 的项目）
- **人工审核**：交叉校验异常的提取结果，后台批准/拒绝（`version_reviews` 表，负样本供重训）
- **提取器配置可管理**：后台 `/admin/extractor` 配置 URL、测试提取、查看决策审计（`/audit`）
- **AI Provider 配置可管理**：后台 `/admin/ai` 增删改 AI Provider（接口/Key/模型）
- **AI 长尾**：version-extractor 低置信 / 无来源 URL 的项目，由外部 AI 兜底（找 URL / 复核）
- **SEO**：新增 URL 提交 Google Indexing API

## 目录结构

```
├── app/
│   ├── api/
│   │   ├── projects/ versions/       # 数据 CRUD
│   │   ├── ops/                      # 运营控制：run/task/extractor-config/gh-actions(废弃)
│   │   ├── admin/
│   │   │   ├── extractor/            # version-extractor 配置/测试/审计代理
│   │   │   └── version-review/       # 人工审核（批准/拒绝）
│   │   └── auth/                     # 登录/登出
│   ├── admin/                        # 后台：仪表盘/项目(含版本管理)/爬虫/运营控制/微任务/提取器/AI
│   └── project/[id]/                 # 项目详情页
├── lib/
│   ├── extractor.ts                  # version-extractor 客户端（DB 配置 URL + env 兜底）
│   ├── extractor-config.ts           # 提取器地址配置（DB AppSetting）
│   ├── tasks.ts                      # 微任务注册表 + 执行引擎（走 version-extractor）
│   ├── ops.ts                        # OpRun 记录 + 即时抓取（version-extractor）
│   ├── version-extract.ts            # 本地启发式兜底（提取器不可用时）
│   ├── github.ts                     # GitHub API（限流多 token，兜底）
│   ├── ai-providers.ts               # AI Provider 读写（AES 加密）
│   └── auth.ts                       # 鉴权（会话 cookie + API key）
├── scripts/
│   ├── update-existing-projects.js   # 全库 TTL 扫（version-extractor 批量更新）
│   └── submit-to-indexing.js
├── .github/workflows/
│   └── github-data-ops.yml           # 定时触发 version-extractor TTL 扫
└── prisma/schema.prisma
```

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 至少设置 DATABASE_URL（PostgreSQL）；EXTRACTOR_URL 可在后台"版本提取器"页配置（DB 优先，env 兜底）

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

支持 Docker 部署（单进程 Next.js standalone），需连一个 version-extractor 服务：

```bash
docker build -t logup .
docker run -p 7860:7860 --env-file .env \
  -e EXTRACTOR_URL=https://your-version-extractor.example.com \
  logup
```

部署后需执行一次迁移以创建新表（app_settings / version_reviews / last_checked_at 等）：

```bash
npx prisma db push   # 或 npx prisma migrate deploy
```

## 版本更新（version-extractor）

版本提取统一由 version-extractor 完成，本站在其上做三层运营：

1. **按需**：后台项目列表点"获取最新版本"→ 走 version-extractor 提取（带产品名触发 LLM 兜底）→ 高置信写库
2. **批量**：`update-existing-projects.js` 全库 TTL 扫（`CHECK_TTL_HOURS=24`）只查过期项目，GitHub Actions 定时（每 3h）触发
3. **人工审核**：交叉校验异常（提取 < 库值 / 低置信）弹窗批准/拒绝 → 批准下次直接采用、拒绝记负样本

**AI 长尾**：version-extractor 低置信 / 无来源 URL 的项目写入 `needs-ai` 清单，由外部 AI 兜底（找官方 URL / 复核版本）。
