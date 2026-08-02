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

软件版本更新追踪站点，收录各类软件项目的版本记录和更新日志，面向中文用户提供本地化内容。以程序化更新为主、AI 运营兜底长尾。

## 技术栈

- **前端 + API**：Next.js 16 App Router（单进程），Tailwind CSS 4
- **数据库**：PostgreSQL + Prisma ORM
- **部署**：Docker，运行在 Hugging Face Spaces
- **自动运营**：GitHub Actions 定时触发（兜底）+ 后台控制平面手动触发
- **工业抓取引擎**：`scripts/crawler.js`（代理池 / UA 轮换 / TLS 指纹 / 重试退避 / 礼貌限速 / 反爬降级）
- **GitHub 爬取**：`lib/github.ts` 直连 GitHub API（限流感知 + 多 token 轮换）
- **规则化版本提取**：`lib/version-extract.ts`（正则 / title / JSON-LD / 正文关键词，不依赖 LLM）
- **运营控制**：后台 `/admin/ops` 触发站内抓取、`/admin/tasks` 微任务、派发 GitHub Actions 流水线
- **AI 配置可管理**：后台 `/admin/ai` 增删改 AI Provider（接口/Key/模型），`/api/translate` 按优先级故障转移
- **chrome-devtools MCP**：给 AI 子代理提供 F12 级浏览器能力（反爬/JS 页面兜底）
- **链接收录**：DDGS Search API 查找中文社区资料
- **SEO**：新增 URL 自动提交 Google Indexing API

## 目录结构

```
├── app/
│   ├── api/                    # Next.js route handlers
│   │   ├── projects/ versions/ # 数据 CRUD
│   │   ├── scrape/github/      # GitHub 爬取 / trending / schedule / fix-icons
│   │   ├── ops/                # 运营控制：run/status/history/task/gh-actions
│   │   ├── admin/              # admin/stats、admin/ai-providers
│   │   └── auth/               # 登录/登出
│   ├── admin/                  # 后台：仪表盘/项目/版本/爬虫/运营控制/微任务/AI Provider
│   └── project/[id]/           # 项目详情页
├── lib/
│   ├── github.ts               # GitHub 爬取 + 限流多 token
│   ├── version-extract.ts      # 规则化版本提取
│   ├── tasks.ts                # 微任务注册表 + 执行引擎
│   ├── ops.ts                  # OpRun 记录 + 运营执行
│   ├── github-actions.ts       # GH Actions 派发/状态/取消
│   ├── ai-providers.ts         # AI Provider 读写（AES 加密）
│   └── auth.ts                 # 鉴权（会话 cookie + API key）
├── scripts/
│   ├── crawler.js              # 工业抓取引擎
│   ├── run-task.js             # 微任务执行器（GH Actions）
│   ├── check-updates.js        # ETag 探测（工业引擎）
│   ├── process-github-updates.js
│   └── submit-to-indexing.js
├── .github/workflows/
│   ├── github-data-ops.yml     # 全量运营流水线（兜底定时器）
│   └── task-run.yml            # 微任务 workflow（后台派发）
└── prisma/schema.prisma
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

部署后需执行一次迁移以创建新表（ai_providers / op_runs / op_tasks）：

```bash
npx prisma migrate deploy   # 或 npx prisma db push
```

## 自动运营

运营可由**后台控制**（`/admin/ops`）或 **GitHub Actions 兜底**触发：

1. **ETag 探测**：`check-updates.js` 用工业引擎并发探测各项目，标记有变化
2. **GitHub 自动更新**：`process-github-updates.js` 程序化比对最新版本并入库
3. **AI 长尾兜底**：非 GitHub / 正则失效 / 新项目，由 Claude Code 子代理（含 chrome-devtools MCP）处理
4. **微任务**：`/admin/tasks` 按需派发 get-version / write-regex / update-project 等细粒度操作
5. **SEO 提交**：新增 URL 提交 Google Indexing API

详细设计见 [docs/industrial-crawler-design.md](docs/industrial-crawler-design.md)。
