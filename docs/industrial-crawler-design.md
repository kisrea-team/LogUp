# 工业级爬虫与运营控制平面设计

> 版本：v1.0
> 状态：设计稿（实现前请先评审）
> 面向：LogUp 爬虫系统工业化改造

## 1. 背景与目标

LogUp 是软件版本更新追踪站点。当前运营依赖 GitHub Actions 定时触发，且**高度依赖 LLM 子代理**完成爬取与录入（README 自评工业化仅 2.5/10）。存在以下问题：

- **控制面单一**：运营只能由 GitHub Actions 触发，缺少可视化控制界面，无法在后台人工干预/调度/查看状态。
- **AI 依赖过重**：大量本可程序化完成的工作（GitHub releases 抓取、正则版本比对、URL 补全）被交给 LLM 子代理，token 消耗巨大且失败率高（GLM 内容过滤 65 次、空报告 47 次）。
- **反爬薄弱**：非 GitHub 页面抓取使用裸 `https.get` + 固定 UA，无代理池、无 TLS 指纹、无重试退避，易被反爬封禁。
- **AI 配置写死**：翻译/LLM 的 API 地址、Key、模型硬编码在环境变量与路由中，后台无法修改。

**目标**：
1. 抓取层工业级化：规则化更强、反爬更强（代理池、UA 轮换、TLS 指纹、重试退避、礼貌限速）。
2. 控制平面化：管理后台提供运营控制界面（触发抓取、查看状态、查看报告、配置调度），GitHub Actions 降级为备份/兜底定时器。
3. AI 配置可管理：后台可增删改 AI Provider（接口地址、Key、模型、启停）。

---

## 2. 现状诊断

| 模块 | 现状 | 问题 |
|------|------|------|
| GitHub 爬取 | `lib/github.ts` 直连 GitHub API | 无限流处理（403/`x-ratelimit-reset`），单 token |
| 页面探测 | `scripts/check-updates.js` 裸 `https.get` + 手动 Playwright | 无代理池、固定 UA、无重试退避、反爬弱 |
| 更新入库 | `scripts/process-github-updates.js`（程序化）+ LLM Phase 1 | GitHub 侧已程序化；非 GitHub 侧大量交给 LLM |
| 新项目收录 | LLM Phase 2（每 3 小时一次，至少 5 个） | token 消耗大、频率过高 |
| 运营报告 | GH Actions 每次创建 issue | 已产生 207 个垃圾 issue |
| 翻译/LLM | `/api/translate` 硬编码 siliconflow 接口与 Key | 无法在后台修改 |
| 控制 | 仅 GH Actions | 无界面、无人工干预入口 |

---

## 3. 工业爬虫引擎（抓取层）

### 3.1 模块位置

新增 `scripts/crawler.js`（CommonJS，供 CI 脚本与后台任务共用），暴露：

```
crawler.fetchPage(url, { js?, timeout?, retries? }) → { status, text, error }
crawler.fetchJson(url, options)                     → { status, body, error }
crawler.createCrawlJob(urls, handlers)              → 批量抓取（并发+限速）
crawler.githubApi(path, { token? })                 → GitHub API（限流感知）
```

### 3.2 反爬能力矩阵

| 能力 | 实现 | 触发 |
|------|------|------|
| **代理池** | 环境变量 `PROXY_URLS`（逗号分隔），轮询轮换；响应 403/429 或连续错误时自动切换代理重试 | 全量页面请求 |
| **UA/浏览器头轮换** | `header-generator` 每次请求生成 Chrome/Win/zh-CN 真实指纹头 | 全量页面请求 |
| **TLS 指纹** | `got-scraping`（模拟真实浏览器 TLS/HTTP2 指纹） | 全量页面请求 |
| **重试退避** | 429/5xx/超时 → 指数退避（1s→2s→4s）+ 随机抖动，默认 3 次 | 错误响应 |
| **礼貌限速** | 每域名最小间隔（默认 1.2s）+ 并发上限（默认 5），随机化间隔 | 全量 |
| **反爬降级** | 普通请求 403/验证码页 → 自动切 Playwright stealth 无头浏览器重试 | 403/挑战页 |
| **robots.txt** | 可选遵守（`CRAWLER_RESPECT_ROBOTS=true`） | 全量 |
| **缓存** | ETag/If-Modified-Since（探测已有） | 探测阶段 |

### 3.3 规则化提取（不依赖 LLM）

按优先级匹配版本信息：

1. **GitHub**：GitHub API `/releases/latest`、`/tags`（程序化，无页面解析）
2. **version_regex**：项目配置的 JS 正则从页面 HTML 提取版本号（探测阶段已用）
3. **RSS/Atom**：页面 `<head>` 自动检测 feed，解析最新条目版本
4. **JSON 端点**：部分站点提供 `api/version` 类 JSON，直接读取
5. **sitemap.xml**：部分站点版本页在 sitemap 中

只有以上都无法提取时才进入 LLM 兜底。

### 3.4 GitHub API 限流与多 token

- 读取 `GITHUB_TOKEN` 及可选 `GITHUB_TOKEN_2`…`GITHUB_TOKEN_5`，轮换使用。
- 收到 `403` 时读取 `x-ratelimit-reset`，等待到重置时间再重试（上限 60s，超过则切换 token）。
- `Retry-After` 头优先于本地估算。

---

## 4. 控制平面（Control Plane）

### 4.1 原则

运营控制不再只依赖 GitHub Actions。**管理后台提供完整控制能力**，GH Actions 保留为可选的兜底定时器。

### 4.2 管理后台控制界面（`/admin`）

新增 **「运营控制」** 页面（`/admin/ops`）：

| 区块 | 功能 |
|------|------|
| **即时抓取** | 一键触发：GitHub 指定仓库抓取 / Trending 抓取 / 全量探测；显示实时结果（新增/更新/跳过数量） |
| **调度配置** | 查看/修改 Trending 与 GitHub 仓库的定时调度（间隔、语言、per_page） |
| **任务历史** | 最近 N 次运营记录：时间、触发方式（手动/GH Actions）、各阶段结果、错误 |
| **代理状态** | 显示 `PROXY_URLS` 是否配置、轮换计数、最近失败代理 |
| **AI Provider** | 见 §5 |

### 4.3 API 端点（均在现有鉴权之上）

```
GET    /api/ops/status            # 全局状态：调度、代理、AI Provider、最近报告
POST   /api/ops/run               # 触发一次运营（body: { phase: 'all'|'github'|'trending'|'probe', repos? }）
GET    /api/ops/history           # 运营历史
```

### 4.4 运营历史存储

新增 `OpRun` 表（见 §6），后台可查看任意历史运行明细。GH Actions 每轮结束后通过 `POST /api/ops/history`（带 x-admin-key）写入一行。

---

## 5. AI Provider 配置管理

### 5.1 数据模型

新增 `ai_providers` 表：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | Int | 主键 |
| `name` | String | 显示名，如 `硅基流动-HunyuanMT` |
| `base_url` | String | OpenAI 兼容接口地址 |
| `api_key` | String | 密钥（加密存储） |
| `model` | String | 默认模型 |
| `enabled` | Boolean | 是否启用 |
| `priority` | Int | 优先级（数字小优先） |
| `created_at` / `updated_at` | DateTime | 时间戳 |

### 5.2 API

```
GET    /api/admin/ai-providers          # 列表（key 脱敏）
POST   /api/admin/ai-providers          # 新增
PUT    /api/admin/ai-providers/[id]     # 修改（含 key）
DELETE /api/admin/ai-providers/[id]     # 删除
```

### 5.3 使用

- `/api/translate` 改为读取启用的 `ai_providers`（按优先级），失败自动降级到下一个。
- 未配置任何 provider 时回退到环境变量 `NVIDIA_API_KEY`（兼容旧配置）。
- **密钥加密**：`api_key` 用 `ADMIN_SESSION_SECRET`（或独立 `AI_KEY_SECRET`）AES 加密存储，接口返回时脱敏（仅显示后 4 位）。

### 5.4 后台界面

`/admin/ai` 页面：表格列出 provider，可新增/编辑/删除/启停；测试连通（调一次 `/api/translate` 空跑）。

---

## 6. 数据模型变更

新增（Prisma）：

```prisma
model AiProvider {
  id        Int      @id @default(autoincrement())
  name      String
  baseUrl   String   @map("base_url")
  apiKey    String   @map("api_key")   // AES 加密
  model     String
  enabled   Boolean  @default(true)
  priority  Int      @default(100)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  @@map("ai_providers")
}

model OpRun {
  id         Int      @id @default(autoincrement())
  triggeredBy String  @default("manual")  // manual | github-action
  phase      String                        // all | github | trending | probe
  status     String   @default("running")  // running | success | failed | partial
  summary    Json?                         // 各阶段结果计数
  error      String?  @db.Text
  startedAt  DateTime @default(now()) @map("started_at")
  finishedAt DateTime? @map("finished_at")
  @@map("op_runs")
}
```

---

## 7. 运营工作流重构（确定性优先）

```
┌──────────────────────────────────────────────────────────────┐
│ 控制面（后台 /api/ops/run 或 GH Actions 兜底）                  │
└───────────────┬──────────────────────────────────────────────┘
                ▼
┌──────────────────────────────────────────────────────────────┐
│ 1. 探测  scripts/check-updates.js（工业引擎，代理+UA+重试）      │  → changed / nocache / regex-failed / regex-changed
├──────────────────────────────────────────────────────────────┤
│ 2. GitHub 更新 scripts/process-github-updates.js（程序化）       │  → 自动补 GitHub update_source_url
├──────────────────────────────────────────────────────────────┤
│ 3. 正则更新 scripts/process-regex-updates.js（程序化，新增）      │  → 有 version_regex 的非 GitHub 项目直接入库
├──────────────────────────────────────────────────────────────┤
│ 4. LLM 长尾（仅剩）：regex-failed / 无 regex 的 changed /        │
│    nocache 嫌疑 / 非 GitHub 无 URL                              │  → 子代理，数量受限
├──────────────────────────────────────────────────────────────┤
│ 5. 新项目收录（每周一次 + 手动，限 5 个）                        │  → LLM
└──────────────────────────────────────────────────────────────┘
```

**报告**：结果写入 `OpRun` 表，后台可查；GH Actions 只在有失败或实质变更时创建 issue（消除 issue 垃圾）。

---

## 8. 目录结构（目标态）

```
├── scripts/
│   ├── crawler.js                # 工业抓取引擎（代理池/UA/TLS/重试/限速）
│   ├── check-updates.js          # 探测（改用 crawler.js）
│   ├── process-github-updates.js # GitHub 程序化更新
│   ├── process-regex-updates.js  # 正则程序化更新（新增）
│   └── submit-to-indexing.js
├── lib/
│   ├── crawler.ts                # TS 侧抓取封装（供后台任务用）
│   ├── github.ts                 # GitHub 爬取 + 限流多 token
│   ├── ai-providers.ts           # AI Provider 读写（加密）
│   └── auth.ts
├── app/api/
│   ├── ops/                      # 运营控制（status/run/history）
│   └── admin/ai-providers/       # AI Provider 管理
├── app/admin/
│   ├── ops/page.tsx              # 运营控制界面
│   └── ai/page.tsx               # AI Provider 界面
└── prisma/schema.prisma
```

---

## 9. 实施路线图

| 阶段 | 内容 | 依赖 |
|------|------|------|
| **P0 文档** | 本文档定稿 | 无 |
| **P1 抓取引擎** | `scripts/crawler.js`（代理/UA/TLS/重试/限速）+ `check-updates.js` 接入 | 无 |
| **P2 数据模型** | Prisma 增加 `AiProvider`、`OpRun`，迁移 | 无 |
| **P3 AI 配置** | `lib/ai-providers.ts`（AES 加密）+ `/api/admin/ai-providers` + `/admin/ai` 界面 + `/api/translate` 接入 | P2 |
| **P4 控制平面** | `/api/ops/*` + `/admin/ops` 界面 + OpRun 记录 | P2、P3 |
| **P5 工作流重构** | `process-regex-updates.js` + GH Actions 改兜底 + 报告去垃圾 + PROXY_URLS 注入 | P1 |
| **P6 GitHub 限流** | `lib/github.ts` 多 token + x-ratelimit-reset | P1 |

---

## 10. 环境变量新增

```
# 代理池（可选，逗号分隔多个）
PROXY_URLS="http://user:pass@host:port,http://user:pass@host2:port"
CRAWLER_RESPECT_ROBOTS=false
CRAWLER_MIN_DELAY_MS=1200
CRAWLER_MAX_CONCURRENCY=5

# AI Provider 密钥加密（可选，默认用 ADMIN_SESSION_SECRET）
AI_KEY_SECRET=""

# GitHub 多 token（可选）
GITHUB_TOKEN_2=""
GITHUB_TOKEN_3=""
```
