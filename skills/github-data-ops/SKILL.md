---
name: github-data-ops
description: |
  GitHub 热门项目数据管理技能，用于将 GitHub 项目信息和版本记录写入数据库。
  触发场景：
  - 用户要抓取/获取 GitHub 热门项目
  - 用户要将 GitHub 项目信息写入数据库
  - 用户要管理项目版本记录
  - 用户提到 "trending"、"热门项目"、"GitHub 数据"、"项目抓取"
  - 用户要查询、创建、更新、删除项目或版本数据
  支持功能：自动抓取热门项目、手动触发抓取、指定仓库抓取、项目/版本 CRUD 操作、直接数据库操作
---

# GitHub 热门项目数据管理

## 数据模型

### projects 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | Int | 主键 |
| `icon` | String | 图标 URL（从 README 提取项目 Logo，否则使用作者头像） |
| `name` | String | 项目名 `owner/repo` |
| `slug` | String? | URL 友好标识 |
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
| `content` | Text | 更新日志（Markdown） |
| `download_url` | String | 下载链接 |

## API 操作

详细 API 文档见 [references/api.md](references/api.md)。

### 快速参考

| 操作 | 方法 | 路径 |
|------|------|------|
| 热门项目抓取状态 | GET | `/api/scrape/github/trending` |
| 触发热门项目抓取 | POST | `/api/scrape/github/trending` |
| 抓取指定仓库 | POST | `/api/scrape/github` |
| 项目列表 | GET | `/api/projects?page=1&per_page=10` |
| 单个项目 | GET | `/api/projects/{id或slug}` |
| 创建项目 | POST | `/api/projects` |
| 更新项目 | PUT | `/api/projects/{id}` |
| 删除项目 | DELETE | `/api/projects/{id}` |
| 新增版本 | POST | `/api/versions` |
| 更新版本 | PUT | `/api/versions/{id}` |
| 删除版本 | DELETE | `/api/versions/{id}` |

## 自动抓取配置

后端启动后 60 秒执行首次抓取，之后每 6 小时自动执行。

抓取逻辑：
1. GitHub Search API 筛选最近 7 天内有推送、stars > 100 的仓库
2. 按热度排序，默认取前 25 个
3. 每个仓库抓取最近 10 条 release
4. 自动补全 describe/author/type/icon 字段

## 图标获取规则

`icon` 字段存储项目图标的 URL，获取逻辑：

### 策略：README Logo 优先，作者头像兜底

1. **从 README 提取项目 Logo（优先）**
   - 解析 README 文件，提取符合图标特点的图片
   - 支持格式：`![alt](url)`、`<img src="url">`

2. **排除非图标类图片**
   - Badge/Shield：`shields.io`、`badge`、`img.shields`
   - CI/CD 状态：`workflow`、`actions`、`travis`、`circleci`、`codecov`
   - 社交链接：`discord`、`twitter`
   - 包管理：`pypi`、`npm`、`crates.io`
   - 其他：`button.svg`、`run.pstmn.io`、`favicon`、`.ico`、`status`

3. **优选包含图标关键词的图片**
   - `logo`、`banner`、`icon`、`brand`

4. **作者头像兜底**
   - URL 格式：`https://github.com/{owner}.png`
   - 当 README 无有效图片时使用

### 图标获取示例代码

```javascript
async function getProjectIcon(owner, repo) {
  const avatarUrl = `https://github.com/${owner}.png`;
  const headers = { 'Authorization': `token ${process.env.GITHUB_TOKEN}` };

  // 排除非图标类图片
  const excludePatterns = [
    /shields\.io/i, /badge/i, /workflow/i, /actions/i,
    /travis/i, /circleci/i, /codecov/i, /coveralls/i,
    /button\.svg/i, /run\.pstmn\.io/i, /favicon/i, /\.ico$/i,
    /status/i, /discord/i, /twitter/i, /pypi/i, /npm/i, /crates\.io/i,
  ];

  // 优选图标关键词
  const preferPatterns = [/logo/i, /banner/i, /icon/i, /brand/i];

  const isValidIcon = (url) => !excludePatterns.some(p => p.test(url));
  const isPreferred = (url) => preferPatterns.some(p => p.test(url));

  // 获取 README
  const readmeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/readme`,
    { headers }
  );

  if (readmeRes.ok) {
    const { content } = await readmeRes.json();
    const text = Buffer.from(content, 'base64').toString('utf-8');

    // 提取所有图片
    const images = [];
    const mdRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
    const imgRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
    let match;
    while ((match = mdRegex.exec(text))) images.push(match[1]);
    while ((match = imgRegex.exec(text))) images.push(match[1]);

    // 优先返回包含 logo/banner/icon/brand 的图片
    const preferred = images.filter(u => isValidIcon(u) && isPreferred(u));
    if (preferred.length > 0) return preferred[0];

    // 其次返回有效图片
    const valid = images.filter(isValidIcon);
    if (valid.length > 0) return valid[0];
  }

  // 兜底：作者头像
  return avatarUrl;
}
```

## 描述字段获取规则

`summar` 和 `describe` 字段的智能获取策略：

### summar 字段（简短摘要）
- **长度**：5-20 个中文字符
- **用途**：列表页快速预览

### describe 字段（详细描述）
- **长度**：50-200 个中文字符
- **用途**：详情页展示

### 获取策略：AI 生成或翻译

AI 根据以下因素自行决定使用哪种方式：
1. **AI 生成**：描述为空、过于简短、技术性强需要补充背景
2. **翻译 GitHub 描述**：描述清晰完整，直接翻译即可

### 示例

| 项目 | summar (5-20字) | describe (50-200字) |
|------|----------------|---------------------|
| vercel/next.js | React 全栈框架 | 用于生产环境的 React 全栈框架，支持 SSR、SSG、API 路由等功能，提供卓越的开发体验和性能优化。 |
| langchain-ai/langchain | LLM 应用开发框架 | 构建大语言模型应用的开发框架，支持链式调用、记忆管理、工具集成，简化 AI 应用开发流程。 |
| ollama/ollama | 本地大模型运行工具 | 在本地轻松运行 Llama、DeepSeek、Qwen 等大语言模型，支持模型管理和 API 调用。 |

GitHub Token 配置（提高 API 速率限制）：
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

## 直接数据库操作

### Prisma Studio
```bash
npx prisma studio
# 浏览器打开 http://localhost:5555
```

### Prisma Client 脚本
见 [references/prisma-scripts.md](references/prisma-scripts.md)。
