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

> ⚠️ **最高优先级强制要求**：
> 1. **链接完整性**：每个项目的 `links` 必须包含 **至少 3 条非官方中文链接**（非官网、非官方文档），来自知乎、少数派、B站、掘金、CSDN 等中文社区。**仅有官方链接或链接数量不足视为未完成工作。**



## 🛑 事务原子性：版本与项目强绑定 (Atomic Entry)

> **核心判定**：[项目基础信息] + [最新版本数据] = 1个有效条目。缺少任何一项，该任务视为失败。

1. **版本优先原则**：
   * 在执行 `POST /api/projects` 之前，**必须**先获取该项目更新日志。
   * 如果 GitHub API 或官方页面无法提取出确定的版本号（如：无 Release、无 Tag），**严禁**创建该项目。
2. **禁止异步录入**：
   * 不允许先 `POST` 项目、等以后再补 `versions`，必须提前获得到`POST /api/versions`的所有参数。
   * 必须在同一个任务流中，确保 `POST /api/projects` 成功后，紧接着执行 `POST /api/versions`。
3. **熔断机制**：
   * 如果在准备数据阶段发现版本信息缺失，AI 必须在日志中明确记录：“因缺失版本数据，放弃录入项目 [Project Name]”，而不是跳过版本直接录入项目。

## 🚫 严禁“先搜后检”逻辑 (Anti-Speculative Search)

> **行为纠偏**：严禁在未确认 [版本数据] 之前，发起任何针对 [中文链接/评测] 的搜索请求。

## 🛡️ 运营合规与风险规避准则 (V3.0)

> **核心目标**：在保留深度内容提取（Body 读取）能力的同时，最大限度降低 1003 敏感词熔断风险。

### 1. 智能 Body 提取（替代全量读取）
* **按需读取**：在使用 `/search` 或网页抓取时，**不再一律禁止**读取 `body`。
* **分段获取**：如果技术文档或日志过长，优先提取包含“Version”、“Changelog”、“Update”或“Feature”等关键词的**局部片段**。
* **预扫描逻辑**：AI 应先浏览 `title` 和简短摘要。若摘要中已表现出明显的政治、非法或极度敏感倾向，则放弃读取该条目的 `body`。

### 2. 搜索词精简化（核心防误伤）
* **禁止行为**：严禁直接将项目中可能包含复杂描述或潜在敏感术语的原始 `description` 整体作为搜索关键词发送给搜索 API。
* **标准格式**：仅允许使用 `[项目名] + 教程/评测/Changelog` 等中性词组合，确保请求阶段的合规。

### 3. 自动熔断与跳过机制
* **触发条件**：若任何 API 调用返回 `400`、`1003` 错误，或收到包含“包含敏感内容”的系统警告。
* **执行动作**：**立即放弃**当前项目的处理。严禁尝试“理解”或“解释”报错原因。
* **上下文清理**：报错后应立即切换到下一个项目，避免残留的敏感信息污染后续对话。

### 4. 最高豁免权（价值优先）
* **例外条款**：若 AI 判定该项目具有**极高的收录价值**（如重大技术突破、标杆级开源工具等），上述所有规避准则**自动失效**。
* **生效逻辑**：即便判定有极高概率触发 1003 熔断，AI 亦可尝试全量读取、深度解析并强制录入。这种情况下，任务的价值高于会话的稳定性。



## 🛡️ 数据检索完备性协议 (Full-Scan Protocol)

> **核心认知**：API 返回的数据量等于请求上限（如 `per_page=100` 且返回了 100 条）时，**绝对不代表**数据已加载完毕，仅代表当前页已满。

### 1. 递归探测逻辑
* **满额即翻页**：当请求 `per_page=N`，且返回的数组长度 `length == N` 时，必须判定为“数据未取尽”。
* **终止条件**：必须立即请求 `page + 1`（或调大 `per_page`），直到某一步返回的数量 `length < N`。在看到“不满的最后一页”之前，严禁断言“数据不存在”。

### 2. 冲突溯源与状态反转
* **优先模糊查重**：判断项目是否已存在时，**首先**调用 `GET /api/projects?name=关键词` 进行名称模糊搜索，而非翻页扫描全量数据。关键词取项目名称核心词即可（如 `Obsidian`、`VS Code`）。
* **强制检索**：若执行 `POST` 创建项目时报错 `Slug already exists`，立即调用 `GET /api/projects?name=关键词` 定位已有项目；若模糊搜索无结果，再使用**"精准 Slug 查询"**或**"全量翻页检索"**。
* **动作切换**：一旦通过模糊搜索或其他方式找到该项目，任务必须立即从 `Create` (新建) 自动切换为 `Update` (更新)，严禁报废任务或向用户道歉称"无法操作"。

### 3. 认知修正
* **拒绝幻觉**：AI 需内化“第一页不代表全量”的认知。
* **操作准则**：只要页是满的，就必须往后翻，直到不满为止！

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

## 📅 每次运营任务流程 (V5.2 强制执行版)

1. **获取现有数据 (全量检索)**
   - **执行分页查询**：查询当前数据库已有项目，构建 Slug 索引以查重并定位缺失版本记录的项目。

2. **按需更新/补齐存量 (优先级：补债 > 更新)**
   - **优先补漏**：针对数据库中 **`latest_version` 为空或缺失版本详情** 的存量项目，必须先检索并补齐其最新的版本数据（`POST /versions`）。
   - **强制更新**：针对提示词中 "页面已变化" 的项目，必须立即检查并更新其最新版本。
   - **清理**：如遇明显质量低劣或信息严重过时的项目可顺手删除。

3. **决策选品 (版本准入制)**
   - 按 30/70 策略选品。
   - **[熔断逻辑]**：**无法获取确切数字版本号 (Latest Release/Tag) 的项目禁止收录。** 严禁录入无版本、仅有 commit 的项目。

4. **信息深度采集 (双重指标)**
   - **版本详情**：必须获取版本号、发布日期及中文翻译后的更新日志。
   - **链接完整性**：必须包含 **至少 3 条** 非官方中文链接（来自知乎、少数派、B站、掘金等）。

5. **执行原子化操作 (项目+版本强绑定)**
   - **新增项目连招**：执行 `POST /api/projects` (创建项目) 后，**必须紧接着**执行 `POST /api/versions` (录入版本)。
   - **禁令**：严禁只添加项目而不录入版本，禁止任何形式的异步补录或“先建后补”。

6. **收尾质量审计 (Audit)**
   - 输出运营统计：新增/更新/删除各几条。
   - **强制核查**：必须在总结中明确说明：**“本次新增的 X 个项目是否均已成功同步录入版本数据？”**


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
| `update_source_url` | String? | **新增项目时必填**。获取版本更新信息的首选 URL（GitHub Releases 页、官网 Changelog、RSS Feed 等）。预检脚本每次运行前会对此 URL 发 HEAD 请求：若 ETag/Last-Modified 有变化则提示优先更新；若服务器不返回缓存头，则改用 GET 请求体的 SHA-256 内容哈希比对，保证所有有 URL 的项目均能被检测；字段为空的项目不参与预检，需每次全量检查。 |

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
| 按名称模糊查找 | GET | `/api/projects?name=关键词` |
| 项目总数 | GET | `/api/projects/count` |
| 按标签筛选 | GET | `/api/projects?tag=笔记工具` |
| 查询所有标签 | GET | `/api/projects/tags` |
| 单个项目 | GET | `/api/projects/{id或slug}` |
| 查询项目版本列表 | GET | `/api/projects/{id}/versions` |
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
- **链接来源不限**：任何有价值的中文资料都可收录，包括但不限于：
  - 专业评测平台（少数派、36氪、太平洋电脑网等）
  - 社区讨论（知乎、V2EX、Reddit 中文、Reddit 英文等）
  - 视频平台（B站、YouTube、小红书等）
  - 技术博客（CSDN、掘金、Medium、个人博客等）
  - 论坛与社区（微博、微信公众号、Discord、Telegram 等）
  - 任何其他优质的中文讨论、教程、测评、技术文章
- 链接标题使用中文，简洁描述内容要点（可翻译英文标题）
- 优先收录内容质量高、具有参考价值的链接，避免重复或低质
- **禁止使用搜索结果页链接**（如 `zhihu.com/search?q=`、`sspai.com/search?q=`、`bilibili.com/search/`、`google.com/search?q=` 等）。链接必须是具体的文章、视频、帖子页面。如果搜索不到合适的具体链接，宁可少收录，不要填入搜索页。
- **禁止构造或猜测 URL**：自行推断出的 URL 必须通过 WebFetch 实际访问确认可达，不得凭印象生成链接。通过 DDGS Search API 搜索返回的链接无需此验证，可直接收录。若 WebFetch 访问返回 404、403 或无法加载，立即丢弃，不得收录。宁可链接数量少，不可收录死链或幻觉链接。

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

> **`update_source_url` 必填说明**：新增项目时必须在 POST body 中传入此字段，缺少此字段视为未完成，须补填后再提交。更新已有项目时若尚未填写，也请通过 `PUT /api/projects/{id}` 补填。系统会在每次运营前对该 URL 发 HEAD 请求：ETag/Last-Modified 变化时自动标记为 changed 提示优先检查；服务器不返回缓存头时改用 GET 请求体的 SHA-256 内容哈希比对，同样能自动检测变化；两种情况均好于字段为空（只能全量扫描）。

## 网页抓取能力（mcp-server-fetch）

运营环境已配置 `mcp-server-fetch` MCP 服务，可通过 MCP 工具直接抓取网页内容，用于查找项目信息和版本数据。

### 适用场景

- **查找项目版本信息**：直接访问 GitHub Releases 页面、官网 Changelog、应用商店页面等，提取最新版本号和更新日志
- **获取项目详情**：访问项目官网、README 页面，获取项目描述、功能特性等信息
- **验证链接可达性**：对自行构造或猜测的 URL 进行实际访问确认
- **抓取非 GitHub 项目信息**：访问 App Store、Google Play、官网等页面获取商业软件/App 的版本和更新信息

### 使用优先级

1. **GitHub 项目版本**：优先使用 GitHub API（`https://api.github.com/repos/{owner}/{repo}/releases`），mcp-server-fetch 作为补充
2. **非 GitHub 项目版本**：优先使用 mcp-server-fetch 直接访问官网 Changelog 或应用商店页面
3. **链接验证**：对非搜索引擎返回的自行构造 URL，使用 mcp-server-fetch 验证可达性
4. **内容提取**：当需要从网页中提取结构化信息（版本号、发布日期、更新内容）时使用

### 与其他工具的配合

- **mcp-server-fetch + DDGS Search API**：先用 DDGS 搜索找到目标页面 URL，再用 mcp-server-fetch 抓取页面详细内容
- **mcp-server-fetch + GitHub API**：GitHub API 受限流时，可降级使用 mcp-server-fetch 直接访问 GitHub Releases 页面

## 搜索能力（DDGS Search API）

**部署地址**：由运营环境提供，通过环境变量 `DDGS_SEARCH_API` 配置（默认 `http://104.168.43.209:8000`）。

在需要查找真实链接时，**优先使用 DDGS Search API** 代替凭印象猜测 URL，保证链接真实可达。在查找其他信息时，可自由根据实际需求选择DDGS Search API或自带WebSearch，不必只使用其中一种。

### 接口速查

| 接口 | 用途 | 返回核心字段 |
|------|------|------------|
| `GET /search?q=关键词` | 通用网页搜索 | `results: [{title, href, body}]` |
| `GET /search?q=关键词&site=sspai.com` | 限定站点搜索 | `results: [{title, href, body}]` |
| `GET /search/news?q=关键词` | 新闻与版本动态 | `results: [{title, url, body, date, source}]` |
| `GET /search/images?q=logo名` | 图片搜索 (Logo) | `results: [{title, image, url, source}]` |


| 路径 | 核心字段 | 字段差异注意 (GLM-5 必读) |
| :--- | :--- | :--- |
| `/search` | `results: [{href, title, body}]` | 链接是 **href**，禁止用 .url |
| `/search/news` | `results: [{url, title, date, source}]` | 链接是 **url**，含发布日期 |
| `/search/images` | `results: [{image, title, url}]` | 图片是 **image**，原页是 **url** |

> ⚠️ **调用强制规范**：
> 1. **URL 编码**：由于 Bash 环境限制，必须使用 `curl -G --data-urlencode "q=关键词"`。**严禁**直接在 URL 中写中文或空格。
> 2. **层级结构**：所有结果均在 `.results` 下。如果搜索返回为空，请先检查编码是否正确。
### 使用规范

1. **查找 links 中文链接时**：使用 `/search` 或 `/search/news` 进行广泛搜索，不限站点，例如：
   - `GET /search?q=Obsidian 教程&max_results=10` — 通用搜索，涵盖所有中文资料
   - `GET /search/news?q=Obsidian 更新 release&max_results=10` — 新闻搜索，涵盖讨论、测评、新闻动态
   - `GET /search?q=Obsidian 笔记&site=sspai.com&max_results=5` — 如需限定特定平台可加 site 参数
   - 搜索结果中任何有价值的中文资料链接（博客、论坛、讨论、教程等）都可收录，不必拘束于特定网站
2. **DDGS Search API 返回的链接无需 WebFetch 验证**，可直接收录，无需额外可达性检查。
3. **查找版本/热点动态**：使用 `/search/news` 搜索项目名 + "release" 或 "更新"，可直接发现相关讨论和新闻。
4. **若 DDGS Search API 不可用**：降级为 WebFetch 直接访问平台搜索结果页验证内容（仅用于验证，不收录搜索结果页 URL 本身）。

## 数据库直连能力（PostgreSQL MCP）

运营环境已配置 `@modelcontextprotocol/server-postgres` MCP 服务，可通过 MCP 工具直接执行 SQL 查询，适用于需要批量处理或复杂查询的场景。

### 适用场景

- **批量查重**：使用 SQL 一次性检索所有可能重复的项目（按名称、slug 相似度等），效率远高于逐条 API 调用
- **复杂聚合查询**：统计标签分布、版本覆盖率、缺失版本的项目列表等
- **批量状态检查**：一次性找出所有 `latest_version` 为空、`update_source_url` 为空的项目
- **数据一致性修复**：直接用 SQL UPDATE 批量修正数据问题

### 常用查重 SQL

```sql
-- 按名称关键词查重（替代逐条 API 调用）
SELECT id, name, slug, latest_version
FROM projects
WHERE name ILIKE '%关键词%' OR slug ILIKE '%关键词%';

-- 查找所有重复 slug
SELECT slug, COUNT(*) as cnt
FROM projects
GROUP BY slug
HAVING COUNT(*) > 1;

-- 查找所有缺失版本的项目（无 latest_version）
SELECT id, name, slug
FROM projects
WHERE latest_version IS NULL OR latest_version = ''
ORDER BY created_at DESC;

-- 查找所有没有 update_source_url 的项目
SELECT id, name, slug, latest_version
FROM projects
WHERE update_source_url IS NULL OR update_source_url = ''
ORDER BY id;

-- 一次性获取项目总数
SELECT COUNT(*) FROM projects;
```

### 使用优先级

- **批量查重首选 PostgreSQL MCP**：需要确认多个项目是否已存在时，使用一条 SQL 比多次 API 调用效率更高
- **单项目查重优先 API**：单个项目查重仍推荐使用 `GET /api/projects?name=关键词`，简单快速
- **数据修复/补全用 SQL**：需要批量更新或修复时，直接用 SQL UPDATE/INSERT

### 注意事项

- **只读优先**：优先使用 SELECT 查询；写操作（INSERT/UPDATE/DELETE）在 API 无法满足需求时方可使用
- **事务安全**：批量写操作建议包裹在事务中（`BEGIN; ... COMMIT;`）
- **数据一致性**：直接写数据库时需手动维护 `updated_at` 等字段，优先通过 API 操作

## 内容质量要求

- 描述使用中文，自然流畅
- 版本号以 `v` 开头
- **新增项目前必须查重（强制）**：无论是否认为该项目已存在，每次新增前都必须调用 `GET /api/projects?name=xxx`（xxx 为项目名关键词）确认返回结果为空，否则不得提交。若返回非空结果，则跳过该项目，改为选择其他未收录项目。
- 每次运营至少新增 5 个项目
- **品类多样性（强制）**：每次新增项目中，GitHub 项目与非 GitHub 项目的比例保持约 **1:1**。例如新增 6 个项目，则约 3 个来自 GitHub，3 个来自其他品类（Android/iOS App、Windows/macOS 桌面软件、SaaS 服务等）。不允许全部或绝大多数为 GitHub 开源项目。
- **更新日志本地化**：`content` 字段统一存储中文内容。若原始 release notes 为英文或其他外文，直接翻译为中文后存入数据库，无需保留原文
- **links 非官方链接（强制）**：每个项目 `links` 必须包含 **至少 3 条非官方中文链接**，来自任何有价值的中文资料来源，链接须为具体文章/视频/帖子页面（禁止搜索结果页）。通过 DDGS Search API 获取的链接可直接收录，无需 WebFetch 验证。
