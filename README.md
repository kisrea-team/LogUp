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

好久不见！

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

## 自我评价（version-extractor 引擎）

| 评测维度 | 现状 | 说明 |
| :--- | :---: | :--- |
| **版本提取精度** | ~89%（80 例基准 71/80） | 注册表 / GitHub API 确定性优先 + LightGBM 过滤 + LambdaRank 页内排序 + LLM 兜底 |
| **注册表覆盖** | brew(cask+formula) / winget / flathub + GitHub API | 自动发现：URL 直解优先 + brew 直查 + GitHub search；python/node/git 等 CLI 工具可命中 |
| **LLM 兜底** | 低 margin 触发，实测 14 例咨询 10 对 | NVIDIA diffusiongemma + modelbest 回退，带产品名触发，并行 12 |
| **人工审核** | 交叉校验异常可批准/拒绝 | `version_reviews` 表，拒绝记负样本供重训，批准下次直接采用 |
| **决策可审计** | 每请求落库 | `/audit` 查页面/候选/rank/LLM/最终 完整决策链 |
| **自动化** | 全库 TTL 扫 + 按需 | 每 3h 只查超过 `CHECK_TTL_HOURS` 的项目，版本没变也标记避免反复重查 |

> 数据来自 80 例真值语料基准（`benchmark/cases.json`）。已知短板：依赖/组件版本（Chromium/Electron 等）数值较大时可能压过产品版本（windsurf 型），由人工审核 + 负样本训练持续收敛。

## 自我评价（LogUp 整体 · deepseek-v4-flash0731）

| 评测维度 | LogUp（当前） | 成熟方案参照 | 差距分析 |
| :--- | :---: | :---: | :--- |
| **基础能力 (Core Logic)** | 6.5 | 8.0 | 版本提取是核心强项（注册表/GitHub 确定性 + LGB 排序 + LLM 兜底，80 例 ~89%）。近期修复 trafilatura 容器探测（恢复 remark 分节）、JSON-LD 退出版本候选、下载清单不当 changelog 等，提取质量进一步收敛；依赖/组件版本混淆、JS 渲染页仍是短板 |
| **工业化程度 (Industrialization)** | 3.5 | 7.0 | TTL 全库扫 + cron 定时 + 后台按需/批量 + 人工审核闭环；但单进程、无队列/分布式，批量更新靠外部串行调用，吞吐受限 |
| **反爬对抗能力 (Anti-Bot)** | 3.0 | 6.0 | Playwright L2 + LLM 覆盖一般 JS 站；Cloudflare/SPA/验证码类高级反爬弱 |
| **稳定运营能力 (SRE/Ops)** | 4.0 | 7.0 | TTL 防反复重查、last_checked_at 对齐、人工审核 + 审计是亮点；强依赖单台外部 extractor（单点）、无告警 |

**总评**：护城河是版本提取质量（~89% 不虚），运营形成"提取→交叉校验→人工审核→负样本回流"闭环。但仍是"单服务 + 定时脚本 + 人工审核"形态——**引擎强（6.5/10）、平台弱（3.5~4/10），初-中级运营系统**，补上工业化、反爬、高可用才能规模化。
