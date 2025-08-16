# Vercel 部署完整指南

## 前置要求

1. **Vercel 账户** - 访问 [vercel.com](https://vercel.com) 注册或登录
2. **GitHub 账户** - 确保项目代码已推送到 GitHub
3. **数据库准备** - 准备好 MySQL 数据库（可以是本地、云服务器或云数据库服务）

## 部署步骤

### 第一步：部署后端 API

1. **登录 Vercel 控制台**
   - 访问 https://vercel.com/login
   - 使用 GitHub 账户登录

2. **创建新项目**
   - 点击 "Add New..." → "Project"
   - 点击 "Import" 选择你的 GitHub 仓库
   - 选择包含后端代码的仓库

3. **配置项目设置**
   - **BUILD COMMAND**: 留空（Vercel 会自动检测）
   - **OUTPUT DIRECTORY**: 留空
   - **INSTALL COMMAND**: 留空
   - **FRAMEWORK PRESET**: 选择 "Other"

4. **配置环境变量**
   在 "Environment Variables" 部分添加以下变量：
   ```
   DB_HOST=your-database-host
   DB_PORT=3306
   DB_USER=your-database-username
   DB_PASSWORD=your-database-password
   DB_NAME=project_updates
   ```
   
   **注意**: 这些环境变量将在部署时注入到应用中，无需在代码中硬编码敏感信息。

5. **部署**
   - 点击 "Deploy" 开始部署
   - 等待部署完成，记下分配的 URL（这将是你的 API_BASE_URL）

### 第二步：部署前端应用

1. **创建新项目**（如果前端在不同仓库）
   - 如果前端和后端在同一仓库，可以跳过这步
   - 如果在不同仓库，重复上述步骤导入前端仓库

2. **配置环境变量**
   在 "Environment Variables" 部分添加：
   ```
   NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.vercel.app
   ```

3. **部署**
   - 点击 "Deploy" 开始部署

## 数据库配置

### 选项 1：使用云数据库服务
- **PlanetScale** - Serverless MySQL
- **AWS RDS** - Amazon 的关系数据库服务
- **Google Cloud SQL** - Google 的云数据库
- **阿里云 RDS** - 阿里云的关系型数据库

### 选项 2：自建 MySQL 数据库
1. 在云服务器上安装 MySQL
2. 配置远程访问权限
3. 创建数据库和表结构

### 数据库表结构
确保你的数据库包含以下表：

```sql
-- 项目表
CREATE TABLE projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    icon VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    latest_version VARCHAR(50),
    latest_update_time DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 版本表
CREATE TABLE versions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    version VARCHAR(50) NOT NULL,
    update_time DATE NOT NULL,
    content TEXT,
    download_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

## 环境变量详解

### 后端环境变量
- `DB_HOST` - 数据库服务器地址
- `DB_PORT` - 数据库端口（通常 3306）
- `DB_USER` - 数据库用户名
- `DB_PASSWORD` - 数据库密码
- `DB_NAME` - 数据库名称

### 前端环境变量
- `NEXT_PUBLIC_API_BASE_URL` - 后端 API 的完整 URL

## 常见问题解决

### 1. 数据库连接失败
- 检查数据库主机地址是否正确
- 确认数据库端口是否开放
- 验证数据库用户名和密码
- 确保数据库允许远程连接

### 2. API 请求失败
- 检查 `NEXT_PUBLIC_API_BASE_URL` 是否正确设置
- 确认后端服务是否正常运行
- 检查 CORS 配置是否正确

### 3. 部署失败
- 查看部署日志获取错误信息
- 确认项目结构是否正确
- 检查依赖包是否完整

## 监控和维护

1. **设置域名**
   - 在 Vercel 项目设置中添加自定义域名
   - 配置 DNS 记录

2. **监控性能**
   - 使用 Vercel Analytics 监控应用性能
   - 设置错误跟踪

3. **自动部署**
   - 配置 GitHub webhook 实现自动部署
   - 设置预览环境

## 安全建议

1. **环境变量安全**
   - 不要在代码中硬编码敏感信息
   - 使用 Vercel 的加密环境变量

2. **API 安全**
   - 为管理接口添加身份验证
   - 实施速率限制
   - 使用 HTTPS

3. **数据库安全**
   - 使用强密码
   - 限制数据库访问权限
   - 定期备份数据