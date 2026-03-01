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
近期不方便调试，在手机上修改调试action多有出现格式问题，请见谅
# LogUp

软件版本更新追踪站点，收录各类软件项目的版本记录和更新日志，面向中文用户提供本地化内容。

## 技术栈

- **前端 + API**：Next.js 15 App Router，Tailwind CSS
- **数据库**：MySQL + Prisma ORM
- **部署**：Docker，运行在 Hugging Face Spaces
- **自动运营**：GitHub Actions 每 6 小时触发，爬取、翻译、入库新项目和版本记录
- **更新检测**：ETag / Last-Modified 探针，只对有变化的项目发起完整检查，降低无效请求
- **链接收录**：调用自部署的 DDGS Search API 查找中文社区资料，自动补充每个项目的参考链接
- **SEO**：新增 URL 自动提交 Google Indexing API

## 本地开发

```bash
npm ci
npm run dev:all
```

## 部署

支持 Docker 部署。
