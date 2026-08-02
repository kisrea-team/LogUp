/**
 * 开发环境启动脚本
 *
 * 同步 Prisma schema 后启动 Next.js 开发服务器。
 * 后端已合并进 Next.js route handlers，无需额外进程。
 */
const { spawnSync, spawn } = require('child_process');

console.log('Starting development environment...');

// 同步 Prisma schema 到数据库（创建缺失的表/列）
console.log('Syncing database schema via prisma db push...');
const pushResult = spawnSync(
  'npx',
  ['prisma', 'db', 'push', '--skip-generate'],
  { stdio: 'inherit', shell: true, env: process.env }
);
if (pushResult.status !== 0) {
  console.warn('Warning: prisma db push failed (status ' + pushResult.status + '), continuing anyway...');
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
