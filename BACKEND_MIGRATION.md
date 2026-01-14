# Backend Migration to Node.js

## 已完成的工作

### 1. Prisma 数据库配置
- ✅ 创建了 `prisma/schema.prisma` 数据库模型定义
- ✅ 定义了 `Project` 和 `Version` 模型，包含外键关系
- ✅ 创建了 `lib/prisma.ts` 数据库连接工具

### 2. 爬虫功能 (使用 Crawlee)
- ✅ 创建了 `lib/scraper.ts`，使用 Crawlee 和 rss-parser
- ✅ 实现了 VS Code RSS feed 爬取功能
- ✅ 支持版本解析、内容清理和 HTML 转 Markdown
- ✅ 已移除腾讯云翻译，直接保存原文

### 3. API 路由
已创建以下 Next.js API 路由替代 Python FastAPI 后端：

- ✅ `GET /api/projects` - 获取分页项目列表
- ✅ `POST /api/projects` - 创建新项目
- ✅ `GET /api/projects/[id]` - 获取单个项目详情（支持 ID 或 slug）
- ✅ `PUT /api/projects/[id]` - 更新项目
- ✅ `DELETE /api/projects/[id]` - 删除项目
- ✅ `GET /api/projects/[id]/versions` - 获取项目版本列表
- ✅ `POST /api/versions` - 创建新版本
- ✅ `PUT /api/versions/[id]` - 更新版本
- ✅ `DELETE /api/versions/[id]` - 删除版本
- ✅ `POST /api/scrape` - 触发爬虫

### 4. 依赖配置
- ✅ 更新了 `package.json`，添加了必要的依赖：
  - `@prisma/client` - Prisma ORM
  - `crawlee` - 网页爬虫框架
  - `rss-parser` - RSS 解析器
  - `turndown` - HTML 转 Markdown

## 需要完成的步骤

### 1. 安装依赖
```bash
npm install
```

### 2. 初始化 Prisma
```bash
npx prisma generate
npx prisma db push
```

### 3. 测试数据库连接
```bash
npx prisma studio
```

### 4. 启动开发服务器
```bash
npm run dev
```

### 5. 测试 API

#### 获取项目列表
```bash
curl http://localhost:3000/api/projects?page=1&per_page=10
```

#### 创建项目
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "icon": "💻",
    "name": "Visual Studio Code",
    "slug": "visual-studio-code",
    "latest_version": "v1.95.0",
    "latest_update_time": "2024-11-01"
  }'
```

#### 触发爬虫
```bash
curl -X POST http://localhost:3000/api/scrape
```

## 文件结构

```
├── prisma/
│   └── schema.prisma          # Prisma 数据库模型
├── lib/
│   ├── prisma.ts              # Prisma 客户端实例
│   ├── scraper.ts             # Crawlee 爬虫实现
│   └── api.ts                 # API 工具函数
├── app/
│   └── api/
│       ├── projects/
│       │   ├── route.ts       # 项目列表 API
│       │   └── [id]/
│       │       ├── route.ts   # 单个项目 API
│       │       └── versions/
│       │           └── route.ts # 项目版本 API
│       ├── versions/
│       │   ├── route.ts       # 版本创建 API
│       │   └── [id]/
│       │       └── route.ts   # 版本更新/删除 API
│       └── scrape/
│           └── route.ts       # 爬虫触发 API
└── package.json               # 更新了依赖
```

## 与 Python 后端的对比

| Python (FastAPI) | Node.js (Next.js) |
|------------------|-------------------|
| `main.py` | `app/api/*/route.ts` |
| `models.py` | `prisma/schema.prisma` |
| `database.py` | `lib/prisma.ts` |
| `scraper.py` | `lib/scraper.ts` |
| feedparser | rss-parser |
| mysql-connector-python | Prisma + mysql2 |
| markdownify | turndown |
| BeautifulSoup | Cheerio (Crawlee 内置) |

## 注意事项

1. **数据库连接**: 确保数据库连接配置正确（已在 `.env` 中设置）
2. **网络问题**: 如果 `npm install` 失败，请检查网络或使用国内镜像
3. **类型安全**: Prisma 提供了完整的 TypeScript 类型支持
4. **开发体验**: 使用 `npx prisma studio` 可以可视化数据库内容