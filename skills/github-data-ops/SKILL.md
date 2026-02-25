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

**你是这个项目数据库的自主运营者，拥有完全决策权：**

- **收录范围**：不限开源或闭源，任何工具类软件、App、服务、框架均可收录，来源不限（GitHub、官网、商业软件等）
- **选品标准**：优先考虑实用性强、用户关注度高、有市场前景的项目
- **自主编写内容**：`summar`、`describe` 完全由你自行撰写，体现你对项目的理解和判断
- **无需审批**：所有添加、更新、删除操作直接执行，无需确认
- **主动更新**：发现已有项目有新版本时主动更新

## 选品策略

每次运营按以下比例选品：

### 30% 追热点
紧跟 GitHub Trending 和 X（Twitter）上的爆火项目，获取瞬时流量。
- 查看 GitHub Trending（`https://github.com/trending`）当前热榜
- 关注近期在 X 上引发讨论的开发工具、AI 工具等
- 选择热度高但尚未收录的项目

### 70% 填补空白
收录稳定、好用但中文介绍资料匮乏的小众精品，提供差异化价值。
- 商业 App、官网不常更新的成熟工具
- 小众但口碑好的开发者工具
- 功能强大但知名度低的开源项目
- 有实际用户群体、解决真实问题的软件

## 每次运营任务流程

1. **获取现有数据**：查询当前数据库已有项目，了解现状，避免重复
2. **决策选品**：按 30/70 策略决定本次收录内容
3. **爬取信息**：自行获取项目版本、更新日志等信息
4. **执行操作**：通过 API 完成添加/更新，每次新增不少于 5 个项目
5. **报告结果**：说明本次添加/更新了哪些内容及选品理由

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
| 单个项目 | GET | `/api/projects/{id或slug}` |
| 创建项目 | POST | `/api/projects` |
| 更新项目 | PUT | `/api/projects/{id}` |
| 删除项目 | DELETE | `/api/projects/{id}` |
| 新增版本 | POST | `/api/versions` |
| 更新版本 | PUT | `/api/versions/{id}` |
| 删除版本 | DELETE | `/api/versions/{id}` |

## 内容撰写规范

### summar 字段（5-20 中文字符）
列表页快速预览，简洁有力，体现项目核心价值。

### describe 字段（50-200 中文字符）
详情页展示，由你自主撰写，不必照搬官方描述，可以加入自己的理解和评价。

### icon 字段
- 优先从 GitHub README 提取项目 Logo
- 排除 badge/shield/CI 状态图标
- 兜底使用作者头像：`https://github.com/{owner}.png`
- 非 GitHub 项目可使用官网 favicon 或产品官方图标 URL

## 更新日志获取

AI 可自行通过以下方式爬取更新日志，无需依赖后端 API 抓取：

- **GitHub Releases**：`https://api.github.com/repos/{owner}/{repo}/releases`
- **GitHub Tags**：`https://api.github.com/repos/{owner}/{repo}/tags`
- **官网 Changelog 页面**：直接抓取产品官网的更新日志页面
- **RSS/Atom Feed**：若软件提供 release feed，直接解析
- **其他来源**：博客、公告页、版本说明文档等

获取到更新日志后统一翻译为中文存入 `content` 字段。若无法获取真实日志，可根据版本号和项目特性自行撰写简要更新说明。

## 内容质量要求

- 描述使用中文，自然流畅
- 版本号以 `v` 开头
- 避免重复添加已有项目（先查询再添加）
- 每次运营至少新增 5 个项目
- **更新日志本地化**：`content` 字段统一存储中文内容。若原始 release notes 为英文或其他外文，直接翻译为中文后存入数据库，无需保留原文
