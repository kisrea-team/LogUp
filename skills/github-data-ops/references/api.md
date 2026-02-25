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
  "type": "TypeScript"
}
```

字段说明：
- `icon`：图标 URL（从 README 提取项目 Logo，排除 badge/shield 等非图标图片，无有效图片则使用作者头像 `https://github.com/{owner}.png`）
- `name`：`owner/repo` 格式
- `slug`：小写加连字符，留空自动生成
- `latest_version`：以 `v` 开头

### 查询项目

```bash
# 分页查询
GET https://zitons-logup-re.hf.space/api/projects?page=1&per_page=10

# 单个项目（id 或 slug）
GET https://zitons-logup-re.hf.space/api/projects/42
GET https://zitons-logup-re.hf.space/api/projects/vercel-nextjs
```

### 更新项目

```bash
PUT https://zitons-logup-re.hf.space/api/projects/42
Content-Type: application/json

{
  "latest_version": "v15.3.0",
  "latest_update_time": "2026-02-24T12:00:00.000Z"
}
```

### 删除项目

```bash
DELETE https://zitons-logup-re.hf.space/api/projects/42
```

## 版本操作

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
