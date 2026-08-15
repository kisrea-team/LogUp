/**
 * 开发环境启动脚本
 *
 * 加载 .env / .env.local 后同步 Prisma schema，再启动 Next.js 开发服务器。
 * 后端已合并进 Next.js route handlers，无需额外进程。
 */
const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 手动加载 .env 文件（Prisma CLI 默认只读 .env；这里也补上 .env.local）
function loadDotenvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch (e) {
    console.error('Failed to load env file:', e);
  }
}

const repoRoot = __dirname;
loadDotenvFile(path.join(repoRoot, '.env'));
loadDotenvFile(path.join(repoRoot, '.env.local'));

console.log('Starting development environment...');

// 同步 Prisma schema 到数据库（创建缺失的表/列）
if (process.env.DATABASE_URL) {
  console.log('Syncing database schema via prisma db push...');
  const pushResult = spawnSync(
    'npx',
    ['prisma', 'db', 'push', '--skip-generate'],
    { stdio: 'inherit', shell: true, env: process.env }
  );
  if (pushResult.status !== 0) {
    console.warn('Warning: prisma db push failed (status ' + pushResult.status + '), continuing anyway...');
  }
} else {
  console.warn('Warning: DATABASE_URL 未设置，跳过 prisma db push（请检查 .env / .env.local）');
}

// Start Next.js dev server
console.log('Starting Next.js frontend...');
const frontend = spawn('npm', ['run', 'dev'], {
  env: { ...process.env },
  stdio: 'inherit',
  shell: true,
});

frontend.on('error', (err) => {
  console.error('Failed to start frontend:', err);
});

// Handle exit
process.on('SIGINT', () => {
  console.log('Stopping services...');
  frontend.kill();
  process.exit();
});
