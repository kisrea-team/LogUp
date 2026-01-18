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
  - mysql
  - docker
pinned: false
---

# LogUp

一个用于展示与管理项目版本更新（Release Notes）的站点，包含前台展示、管理后台、GitHub Release 爬取与翻译。

## 本地开发

安装依赖：

```bash
npm ci
```

准备环境变量（见下方“配置”），然后启动开发环境（前端 + 后端 + 本地 RSSHub）：

```bash
npm run dev:all
```

只启动前端（Next dev）：

```bash
npm run dev
```

后端默认端口为 `8000`（`BACKEND_NODE_PORT`），前端默认端口为 `3000`。

## 生产启动（本地）

```bash
npm run build
npm start
```

`npm start` 会执行 `start-production.js`，同时启动：
- 后端：`backend-repo/server.js`（`BACKEND_NODE_PORT`，默认 8000）
- 前端：`next start`（监听 `PORT`）

## 管理后台

- 登录页：`/admin/login`
- 控制台：`/admin`

默认账号（仅用于本地/演示环境，建议上线前自行改造）：
- Username: `admin`
- Password: `admin123`

## 配置

本项目使用 Prisma 连接 MySQL，且翻译接口需要 NVIDIA 的 API Key。

### 必需环境变量

#### 数据库（Prisma / MySQL）

`DATABASE_URL`：

```bash
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DB_NAME"
```

首次初始化/同步表结构：

```bash
npm run db:generate
npm run db:push
```

#### 翻译（可选，但翻译功能依赖它）

`NVIDIA_API_KEY`：用于 `/api/translate` 翻译接口。

```bash
NVIDIA_API_KEY="your-nvapi-key"
```

### 常用可选环境变量

#### 端口与服务

- `PORT`：前端监听端口（Hugging Face Spaces 默认为 7860）
- `BACKEND_NODE_PORT`：后端监听端口（默认 8000）

#### API 转发（只在你需要把 /api 代理到外部后端时用）

默认情况下，Next.js 会把 `/api/*` 重写到 `http://127.0.0.1:${BACKEND_NODE_PORT}`。
如需指向外部后端，可设置：

```bash
NEXT_PUBLIC_API_BASE_URL="https://your-backend-host"
```

#### SSH 隧道（可选）

后端会尝试根据环境变量自动建立 SSH 隧道（用于无法直连数据库的场景）。
在容器/Spaces 上通常建议关闭：

```bash
DISABLE_SSH_TUNNEL="true"
```

如果你确实需要隧道，请设置（示例）：

```bash
DISABLE_SSH_TUNNEL="false"
SSH_HOST="your-ssh-host"
SSH_PORT="22"
SSH_USER="your-ssh-user"
SSH_PASSWORD="your-ssh-password"
SSH_LOCAL_PORT="3307"
SSH_DB_HOST="127.0.0.1"
SSH_DB_PORT="3306"
DB_USER="db-user"
DB_PASSWORD="db-password"
DB_NAME="db-name"
```

## Hugging Face Spaces（Docker）部署

本仓库已包含 Dockerfile，Spaces 选择 `Docker` 即可构建运行。

建议在 Space 的 Variables/Secrets 中设置：
- `DATABASE_URL`
- `NVIDIA_API_KEY`
- （可选）`DISABLE_SSH_TUNNEL=true`

容器对外服务端口为 `7860`（已在本 README 的 front matter 中通过 `app_port: 7860` 声明）。
