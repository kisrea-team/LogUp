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

- **自主选择项目**：不局限于 GitHub 开源项目，任何你认为有价值的工具、软件、框架、服务、App 均可收录，来源不限（GitHub、官网、商业软件等）
- **自主编写内容**：`summar`、`describe` 完全由你自行撰写，体现你对项目的理解和判断
- **无需审批**：所有添加、更新、删除操作直接执行，无需确认
- **自主判断价值**：根据项目的实用性、创新性、社区活跃度等自行评估是否值得收录
- **主动更新**：发现已有项目有新版本时主动更新

## 每次运营任务流程

1. **获取现有数据**：查询当前数据库已有项目，了解现状
2. **决策本次内容**：自主决定本次要添加哪些项目、更新哪些已有项目
3. **执行操作**：通过 API 完成添加/更新，每次新增不少于 5 个项目
4. **报告结果**：说明本次添加/更新了哪些内容及理由

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
