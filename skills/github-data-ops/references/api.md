# API 详细文档

## 热门项目抓取

### 手动触发抓取

```bash
POST https://zitons-logup-re.hf.space/api/scrape/github/trending
Content-Type: application/json

{
  "language": "TypeScript",  // 可选，筛选语言
  "since": "weekly",         // daily/weekly/monthly
  "per_page": 25,            // 返回数量（最大30）
  "limit_per_repo": 10,      // 每仓库 release 数量
  "run_now": true            // 是否立即执行
}
```

### 修改定时计划

```bash
POST https://zitons-logup-re.hf.space/api/scrape/github/trending
Content-Type: application/json

{
  "set_schedule": true,
  "interval_minutes": 120,
  "run_now": false
}
```

### 查看计划状态

```bash
GET https://zitons-logup-re.hf.space/api/scrape/github/trending
```

返回示例：
```json
{
  "success": true,
  "schedule": {
    "enabled": true,
    "language": "",
    "since": "weekly",
    "per_page": 25,
    "limit_per_repo": 10,
    "interval_minutes": 360,
    "last_run_at": "2026-02-24T08:00:00.000Z",
    "running": false
  }
}
```

### 抓取指定仓库

```bash
POST https://zitons-logup-re.hf.space/api/scrape/github
Content-Type: application/json

{
  "repos": ["vercel/next.js", "microsoft/vscode"],
  "include_prerelease": false,
  "limit_per_repo": 10
}
```

## 项目操作

### 创建项目

```bash
POST https://zitons-logup-re.hf.space/api/projects
Content-Type: application/json

{
  "icon": "TS",
  "name": "vercel/next.js",
  "slug": "vercel-nextjs",
  "latest_version": "v15.2.0",
  "latest_update_time": "2026-02-20T10:00:00.000Z",
  "describe": "The React Framework for the Web",
  "summar": "The React Framework for the Web",
  "author": "vercel",
  "type": "TypeScript",
  "tags": ["开发工具", "前端框架", "开源", "跨平台"],
  "links": [
    { "title": "Next.js 官方文档", "url": "https://nextjs.org/docs", "type": "docs" },
    { "title": "少数派：Next.js 快速上手指南", "url": "https://sspai.com/...", "type": "tutorial" }
  ]
}
```

字段说明：
- `icon`：图标 URL（从 README 提取项目 Logo，排除 badge/shield 等非图标图片，无有效图片则使用作者头像 `https://github.com/{owner}.png`）
- `name`：`owner/repo` 格式
- `slug`：小写加连字符，留空自动生成
- `latest_version`：以 `v` 开头
- `tags`：中文标签数组，2-5 个，用于关联同类项目
- `links`：相关资源链接数组，每条含 `title`（中文标题）、`url`、`type`（tutorial/review/docs/video/blog/community）
- `update_source_url`（可选）：预检脚本通过此 URL 检测更新，建议填写
- `version_regex`（可选）：从 `update_source_url` 页面 HTML 中提取版本号的 JS 正则（带捕获组，捕获组1为版本号）。供预检脚本对 no-cache 项目直接精确检测版本变化，无需依赖 Content-Length。示例：`"class=\"version\">([\\d.]+)<"`

### 查询项目

```bash
# 分页查询
GET https://zitons-logup-re.hf.space/api/projects?page=1&per_page=10

# 按名称模糊查找（仅匹配 name 字段，用于查重）
GET https://zitons-logup-re.hf.space/api/projects?name=obsidian

# 按标签筛选
GET https://zitons-logup-re.hf.space/api/projects?tag=笔记工具

# 单个项目（id 或 slug）
GET https://zitons-logup-re.hf.space/api/projects/42
GET https://zitons-logup-re.hf.space/api/projects/vercel-nextjs
```

### 查询项目总数

```bash
GET https://zitons-logup-re.hf.space/api/projects/count
```

返回示例：
```json
{ "total": 128 }
```

### 查询所有已有标签

```bash
GET https://zitons-logup-re.hf.space/api/projects/tags
```

返回示例：
```json
{
  "tags": ["AI 助手", "代码编辑器", "开发工具", "笔记工具", "跨平台"]
}
```

**建议在新增项目前调用此接口，复用已有标签保持一致性。**

### 更新项目

```bash
PUT https://zitons-logup-re.hf.space/api/projects/42
Content-Type: application/json

{
  "latest_version": "v15.3.0",
  "latest_update_time": "2026-02-24T12:00:00.000Z",
  "tags": ["开发工具", "前端框架", "开源", "跨平台"],
  "links": [
    { "title": "Next.js 官方文档", "url": "https://nextjs.org/docs", "type": "docs" },
    { "title": "少数派：Next.js 快速上手指南", "url": "https://sspai.com/...", "type": "tutorial" }
  ]
}
```

### 删除项目

```bash
DELETE https://zitons-logup-re.hf.space/api/projects/42
```

## 版本操作

### 查询项目版本列表

```bash
GET https://zitons-logup-re.hf.space/api/projects/42/versions
```

返回示例：
```json
[
  {
    "id": 123,
    "project_id": 42,
    "version": "v15.3.0",
    "update_time": "2026-02-24T12:00:00.000Z",
    "content": "## 更新内容\n\n- 新增功能",
    "translation": null,
    "download_url": "https://github.com/vercel/next.js/archive/refs/tags/v15.3.0.zip"
  }
]
```

> 按 `update_time` 倒序排列。**在检查项目是否已有某版本时必须先调用此接口**，避免重复写入。

### 新增版本

```bash
POST https://zitons-logup-re.hf.space/api/versions
Content-Type: application/json

{
  "project_id": 42,
  "version": "v15.3.0",
  "update_time": "2026-02-24T12:00:00.000Z",
  "content": "## What's New\n\n- 新增功能\n- 修复问题",
  "download_url": "https://github.com/vercel/next.js/archive/refs/tags/v15.3.0.zip"
}
```

### 更新版本

```bash
PUT https://zitons-logup-re.hf.space/api/versions/123
Content-Type: application/json

{
  "content": "## What's New\n\n（更新后的日志内容）"
}
```

### 删除版本

```bash
DELETE https://zitons-logup-re.hf.space/api/versions/123
```
