# Onlook Starter Template

<p align="center">
  <img src="app/favicon.ico" />
</p>

This is an [Onlook](https://onlook.com/) project set up with
[Next.js](https://nextjs.org/), [TailwindCSS](https://tailwindcss.com/) and
[ShadCN](https://ui.shadcn.com).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in Onlook to see the result.

## Admin Interface

This project includes a complete admin interface for managing projects and versions.

### Access

- Admin Login: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- Admin Dashboard: [http://localhost:3000/admin](http://localhost:3000/admin)

### Default Credentials

- Username: `admin`
- Password: `admin123`

### Features

1. **Project Management** - Add, view, and delete projects
2. **Version Management** - Add, edit, and delete project versions
3. **Ad Analytics** - View advertising performance data

### Backend API

The backend API runs on [http://localhost:8000](http://localhost:8000) and provides endpoints for:
- Project CRUD operations
- Version CRUD operations
- Ad analytics data

To start the backend server:
```bash
cd backend
python main.py
```

## Vercel Deployment

This project is configured for deployment on Vercel with separate frontend and backend deployments.

### Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account** - Repository should be pushed to GitHub
3. **MySQL Database** - Prepare a MySQL database

### Deployment Steps

#### 1. Deploy Backend API

1. **Login to Vercel Dashboard**
   - Visit https://vercel.com/login
   - Login with your GitHub account

2. **Create New Project**
   - Click "Add New..." → "Project"
   - Click "Import" and select your GitHub repository

3. **Configure Project Settings**
   - **BUILD COMMAND**: Leave empty (Vercel will auto-detect)
   - **OUTPUT DIRECTORY**: Leave empty
   - **INSTALL COMMAND**: Leave empty
   - **FRAMEWORK PRESET**: Select "Other"

4. **Set Environment Variables**
   In the "Environment Variables" section, add:
   ```
   DB_HOST=your-database-host
   DB_PORT=3306
   DB_USER=your-database-username
   DB_PASSWORD=your-database-password
   DB_NAME=project_updates
   ```
   
   **Note**: These environment variables will be injected into your application at runtime. Vercel securely handles sensitive information.

5. **Deploy**
   - Click "Deploy" to start deployment
   - Wait for completion and note the assigned URL (this will be your API_BASE_URL)

#### 2. Deploy Frontend Application

1. **Set Environment Variables**
   In the "Environment Variables" section, add:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.vercel.app
   ```

2. **Deploy**
   - Click "Deploy" to start deployment

### Database Setup

You can use any MySQL database service:

1. **Cloud Database Services**:
   - PlanetScale (Serverless MySQL)
   - AWS RDS
   - Google Cloud SQL
   -阿里云 RDS

2. **Self-hosted MySQL**:
   - Install MySQL on a cloud server
   - Configure remote access permissions
   - Create database and table structure

### Required Environment Variables

#### Backend:
- `DB_HOST` - Database server address
- `DB_PORT` - Database port (usually 3306)
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name

#### Frontend:
- `NEXT_PUBLIC_API_BASE_URL` - Backend API full URL

### Troubleshooting

1. **Database Connection Failed**:
   - Check database host address
   - Verify database port is open
   - Confirm username and password
   - Ensure remote access is allowed

2. **API Requests Failed**:
   - Check `NEXT_PUBLIC_API_BASE_URL` setting
   - Confirm backend service is running
   - Check CORS configuration

For detailed deployment instructions, see [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)

### Backend Deployment

The backend has been separated into its own repository at [zitons/LogUp---Backend](https://github.com/zitons/LogUp---Backend). The backend API is built with FastAPI and Python, and can be deployed to platforms that support Python applications such as Railway, Render, or Heroku.

**Note**: The backend application is started through `start.py` and is now maintained in a separate repository.
