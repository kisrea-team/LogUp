---
name: github-data-ops
description: |
  项目数据自主运营技能，由 AI 自主决策维护项目数据库内容。
  触发场景：
  - 用户要触发项目数据更新/运营
  - 用户提到 "trending"、"热门项目"、"数据"、"项目抓取"、"运营"
  - 定时自动运营任务
  支持功能：自主选择项目、自主编写简介、自主管理版本、CRUD 操作
---

# 项目数据自主运营

## 运营原则

> ⚠️ **最高优先级强制要求**：每个项目的 `links` 必须包含 **至少 3 条非官方中文链接**（非官网、非官方文档），来自知乎、少数派、B站、掘金、CSDN 等中文社区。**仅有官方链接或链接数量不足视为未完成工作。**

**你是这个项目数据库的自主运营者，拥有完全决策权：**

- **收录范围**：不限开源或闭源，任何工具类软件、App、服务、框架均可收录，包括但不限于：
  - Android / iOS App
  - Windows / macOS / Linux 桌面软件
  - 开源框架与库
  - 在线服务与 SaaS 工具
  - 命令行工具、开发者工具
- **选品标准**：优先考虑实用性强、用户关注度高、有市场前景的项目
- **自主编写内容**：`summar`、`describe` 完全由你自行撰写，体现你对项目的理解和判断
- **无需审批**：所有添加、更新、删除操作直接执行，无需确认
- **主动更新**：发现已有项目有新版本时主动更新
- **自主淘汰**：对现有项目进行质量评估，发现以下情况可直接删除，无需确认：
  - 项目已停止维护、长期无更新且无活跃社区
  - 信息严重过时或错误
  - 实用价值低、收录意义不大

## 选品策略

每次运营按以下比例选品：

### 30% 追热点
紧跟各渠道热门动态，获取瞬时流量。热点来源不限，包括但不限于：
- GitHub Trending 热榜
- X（Twitter）/ Reddit / Hacker News 上的爆火讨论
- Product Hunt 新品榜
- 各大应用商店（Google Play / App Store）排行榜近期上升趋势
- 科技媒体报道（36氪、少数派、V2EX 等）
- 选择热度高但尚未收录的项目

### 70% 填补空白
收录稳定、好用但中文介绍资料匮乏的小众精品，提供差异化价值。
- 商业 App、官网不常更新的成熟工具
- 小众但口碑好的开发者工具
- 功能强大但知名度低的开源项目
- 有实际用户群体、解决真实问题的软件

## 每次运营任务流程

1. **获取现有数据**：查询当前数据库已有项目，了解现状，避免重复
2. **存量评估**：对现有项目进行运营评估，自主决策是否删除质量低劣、信息过时、无实际价值的项目
3. **决策选品**：按 30/70 策略决定本次收录内容
4. **爬取信息**：自行获取项目版本、更新日志等信息
5. **执行操作**：通过 API 完成添加/更新/删除，每次新增不少于 5 个项目
6. **收尾汇总**：所有操作完成后，输出本次运营的简要统计（新增/更新/删除各几条）

## 数据模型

### projects 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | Int | 主键 |
| `icon` | String | 图标 URL |
| `name` | String | 项目名，GitHub 项目用 `owner/repo`，其他软件用产品名即可 |
| `slug` | String? | URL 友好标识，留空自动生成 |
| `latest_version` | String | 最新版本号 |
| `latest_update_time` | DateTime | 最新版本发布时间 |
| `describe` | Text? | 详细描述（50-200 中文字符） |
| `summar` | Text? | 简短摘要（5-20 中文字符） |
| `author` | String? | 作者/组织 |
| `type` | String? | 语言/分类 |
| `tags` | String[] | 标签列表，用于关联同类项目（见标签规范） |
| `links` | Json | 相关资源链接数组（见链接规范） |
| `update_source_url` | String? | **可选**。获取版本更新信息的首选 URL（GitHub Releases 页、官网 Changelog、RSS Feed 等）。AI 收录项目时主动填写；预检脚本每次运行前会对此 URL 发送 HEAD 请求，若 ETag/Last-Modified 有变化则提示优先更新。 |

### versions 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | Int | 主键 |
| `project_id` | Int | 关联 projects.id |
| `version` | String | 版本号 |
| `update_time` | DateTime | 发布时间 |
| `content` | Text | 更新日志（Markdown，可由 AI 撰写） |
| `download_url` | String | 下载链接 |

## API 操作

详细 API 文档见 [references/api.md](references/api.md)。

### 快速参考

| 操作 | 方法 | 路径 |
|------|------|------|
| 触发 GitHub 热门抓取 | POST | `/api/scrape/github/trending` |
| 抓取指定仓库 | POST | `/api/scrape/github` |
| 项目列表 | GET | `/api/projects?page=1&per_page=50` |
| 按标签筛选 | GET | `/api/projects?tag=笔记工具` |
| 查询所有标签 | GET | `/api/projects/tags` |
| 单个项目 | GET | `/api/projects/{id或slug}` |
| 创建项目 | POST | `/api/projects` |
| 更新项目 | PUT | `/api/projects/{id}` |
| 删除项目 | DELETE | `/api/projects/{id}` |
| 新增版本 | POST | `/api/versions` |
| 更新版本 | PUT | `/api/versions/{id}` |
| 删除版本 | DELETE | `/api/versions/{id}` |

## 内容撰写规范

### tags 字段（标签）
用于将相关项目串联，用户可通过标签发现同类工具。

**标签规范：**
- 每个项目打 2-5 个标签
- 标签使用中文，简洁（2-6 字为宜），不加 `#` 前缀，直接存储文字
- 标签类型（可组合选取）：
  - **功能类**：笔记工具、代码编辑器、容器管理、AI 助手、截图工具、密码管理等
  - **场景类**：自托管、效率工具、开发工具、设计工具、团队协作等
  - **平台类**：跨平台、Android、iOS、macOS、Windows、命令行等
  - **技术类**：开源、本地优先、隐私保护、端对端加密等
- 优先使用已有项目用过的标签（保持一致性），可通过 `GET /api/projects/tags` 查询现有标签
- 标签要能有效关联同类产品，例如 Obsidian 和 Logseq 都应有"笔记工具"标签

**示例：**
- Obsidian：`["笔记工具", "本地优先", "知识管理", "跨平台"]`
- VS Code：`["代码编辑器", "开发工具", "跨平台", "开源"]`
- 1Password：`["密码管理", "安全工具", "跨平台"]`

### links 字段（相关资源链接）
用于为项目附上更新日志来源、教程、测评、文档、视频等优质外部资源，帮助用户快速上手或深入了解。

**链接结构：**
```json
{ "title": "链接标题", "url": "https://...", "type": "tutorial" }
```

**type 可选值：**
| 值 | 含义 |
|----|------|
| `tutorial` | 教程（操作指南、上手教程） |
| `review` | 测评（横评、体验报告） |
| `docs` | 文档（官方或第三方文档） |
| `video` | 视频（B站、YouTube 视频） |
| `blog` | 博客（技术文章、使用分享） |
| `community` | 社区（Discord、Reddit、论坛帖子） |

**收录规范：**
- **必须包含至少 3 条非官方链接**（非官网、非官方文档），来自中文社区；其余数量由 AI 自行决定
- **中文本地化链接优先**，目标是让中文用户不看官方文档就能上手或了解该项目，尽量多收录中文社区内容
- 中文来源渠道（重点搜索）：
  - 少数派（sspai.com）：产品测评、使用体验
  - 知乎：教程专栏、使用心得、横向对比
  - B站（bilibili.com）：视频教程、功能演示
  - CSDN / 掘金（juejin.cn）：技术教程、集成指南
  - 微信公众号文章（可通过搜狗搜索 `site:mp.weixin.qq.com` 查找）
- 链接标题使用中文，简洁描述内容要点（可翻译英文标题）
- 优先收录内容质量高、具有参考价值的链接，避免重复或低质
- **禁止使用搜索结果页链接**（如 `zhihu.com/search?q=`、`sspai.com/search?q=`、`bilibili.com/search/`、`google.com/search?q=` 等）。链接必须是具体的文章、视频、帖子页面。如果搜索不到合适的具体链接，宁可少收录，不要填入搜索页。
- **禁止构造或猜测 URL**：每条链接必须通过 WebFetch 实际访问确认可达（HTTP 200），不得凭印象或推断生成链接。若访问返回 404、403 或无法加载，立即丢弃该链接，不得收录。宁可链接数量少，不可收录死链或幻觉链接。

**示例：**
```json
[
  { "title": "官方文档", "url": "https://...", "type": "docs" },
  { "title": "少数派：一个让你爱不释手的笔记应用", "url": "https://sspai.com/...", "type": "review" },
  { "title": "B站教程：从零开始使用 Obsidian", "url": "https://bilibili.com/...", "type": "video" },
  { "title": "知乎：Obsidian 与 Notion 深度对比", "url": "https://zhihu.com/...", "type": "blog" }
]
```

### summar 字段（5-20 中文字符）
列表页快速预览，简洁有力，体现项目核心价值。必须为中文。

### describe 字段
详情页展示，必须为中文。两段内容**顺序固定、不可合并**：

**第一段：项目介绍**（直接写正文，不加任何标题或标签）
1. **官方原文翻译**：若能获取项目官网、README 或 GitHub 描述的完整原文，翻译后直接存入，**不限字数**，尽量完整呈现
2. **AI 自主撰写**：无法获取原文时，自行撰写 50-200 中文字符的描述

**第二段：社区洞察**（可选，如能获取）
主动搜索 Reddit、Hacker News、V2EX 等社区中关于该项目的讨论，用 blockquote 框住，放在项目介绍之后。blockquote 内直接写来源和内容，不加标签文字。

**格式要求（固定写法）**：
```
这里写项目描述正文...

> 来源社区名：具体社区评价内容...
```

完整格式示例：
```
Outline 是一款开源的团队知识库工具，支持 Markdown 编辑、实时协作与权限管理，可自托管部署，界面简洁类 Notion。

> r/selfhosted：在该社区讨论最多的三个标签是 #内存屠夫、#极简安装、#Notion平替。大部分老用户（v2.0 之前）认为它的新版虽然 UI 好看了，但失去了原本的轻量化优势。
```

社区洞察内容要求：
- 标注来源社区（如 `r/xxx`、Hacker News、V2EX 等）
- 提炼 2-3 个社区高频标签或评价关键词
- 反映真实的用户分歧或口碑亮点，不要空洞表扬
- 若搜索无结果或项目过于小众，可省略整个 blockquote

### icon 字段
- GitHub 项目：优先从 README 提取 Logo，排除 badge/shield/CI 状态图标，兜底用作者头像 `https://github.com/{owner}.png`
- 非 GitHub 项目：从官网获取 Logo 图片 URL，或使用 `https://www.google.com/s2/favicons?domain={domain}&sz=128` 作为兜底

## 更新日志获取

AI 可自行通过以下方式爬取更新日志，无需依赖后端 API 抓取：

- **优先：复用已有 `links`**：更新已有项目时，先扫描该项目的 `links` 数组，找到 GitHub Releases、官网 Changelog、RSS Feed 等可用于获取版本信息的链接，直接访问，无需重新搜索来源。
- **GitHub Releases**：`https://api.github.com/repos/{owner}/{repo}/releases`
- **GitHub Tags**：`https://api.github.com/repos/{owner}/{repo}/tags`
- **官网 Changelog 页面**：直接抓取产品官网的更新日志页面
- **RSS/Atom Feed**：若软件提供 release feed，直接解析
- **其他来源**：博客、公告页、版本说明文档等

获取到更新日志后统一翻译为中文存入 `content` 字段。若无法获取真实日志，可根据版本号和项目特性自行撰写简要更新说明。

> **`update_source_url` 字段维护**：收录或更新项目时，将本次实际访问的版本来源 URL 写入 `update_source_url` 字段——新建项目时在 POST body 中传入，更新已有项目时通过 `PUT /api/projects/{id}` 的 `update_source_url` 参数同步写入。系统会在每次运营前对该 URL 发 HEAD 请求，ETag/Last-Modified 变化时自动提示优先检查该项目，从而减少每次全量扫描的工作量。若字段为空，该项目将不参与预检。

## 内容质量要求

- 描述使用中文，自然流畅
- 版本号以 `v` 开头
- 避免重复添加已有项目（先查询再添加）
- 每次运营至少新增 5 个项目
- **品类多样性（强制）**：每次新增项目中，GitHub 项目与非 GitHub 项目的比例保持约 **1:1**。例如新增 6 个项目，则约 3 个来自 GitHub，3 个来自其他品类（Android/iOS App、Windows/macOS 桌面软件、SaaS 服务等）。不允许全部或绝大多数为 GitHub 开源项目。
- **更新日志本地化**：`content` 字段统一存储中文内容。若原始 release notes 为英文或其他外文，直接翻译为中文后存入数据库，无需保留原文
- **links 非官方链接（强制）**：每个项目 `links` 必须包含 **至少 3 条非官方中文链接**，总数量由 AI 自行决定，链接须为具体文章/视频/帖子页面（禁止搜索结果页）
