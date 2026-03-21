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

软件版本更新追踪站点，收录各类软件项目的版本记录和更新日志，面向中文用户提供本地化内容。
目标是成为工业级爬取系统，未来将使用机器算法代替LLM。以下的评测已经过时。
| 评测维度 | GPT-5.4 (Current) | Opus 4.6 | 差距分析 |
| :--- | :---: | :---: | :--- |
| **基础能力 (Core Logic)** | 6.0 | 5.5 | GPT 在逻辑闭环和工具调用（MCP）上略显果断。 |
| **工业化程度 (Industrialization)** | 3.5 | 2.5 | 均处于初级阶段，难以自主处理大规模并行调度。 |
| **反爬对抗能力 (Anti-Bot)** | 3.0 | 2.0 | 对高级反爬（TLS/HLS/验证码）的理解依然停留在理论。 |
| **稳定运营能力 (SRE/Ops)** | 5.0 | 4.0 | GPT 在异常重试和状态对齐上更稳健。 |

## 技术栈

- **前端 + API**：Next.js 15 App Router，Tailwind CSS
- **数据库**：MySQL + Prisma ORM
- **部署**：Docker，运行在 Hugging Face Spaces
- **自动运营**：GitHub Actions 每 6 小时触发，爬取、翻译、入库新项目和版本记录
- **更新检测**：ETag 探针和正则匹配，只对有变化的项目发起完整检查，降低无效请求
- **正则匹配**：收录最新版本号匹配策略，以保证程序化更新
- **多Agent处理**：有效隔离上下文和避免敏感词熔断
- **击中缓存**：大部分Token都是缓存Token，成本较低

- **链接收录**：调用自部署的 DDGS Search API 查找中文社区资料，自动补充每个项目的参考链接
- **SEO**：新增 URL 自动提交 Google Indexing API

## 本地开发

```bash
npm ci
npm run dev:all
```

## 部署

支持 Docker 部署。
