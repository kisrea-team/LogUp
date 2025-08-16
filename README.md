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
