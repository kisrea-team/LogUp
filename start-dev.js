
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure database URL is set via SSH tunnel if needed
// require('./lib/ensure-ssh-tunnel'); // backend-repo/server.js does this internally

console.log('Starting development environment...');

// Sync Prisma schema to database (creates missing columns like `slug`)
console.log('Syncing database schema via prisma db push...');
const pushResult = spawnSync(
  'npx', ['prisma', 'db', 'push', '--accept-data-loss', '--skip-generate'],
  { stdio: 'inherit', shell: true, env: process.env }
);
if (pushResult.status !== 0) {
  console.warn('Warning: prisma db push failed (status ' + pushResult.status + '), continuing anyway...');
}

// Start RSSHub (local)
const rsshubPort = process.env.RSSHUB_PORT || '1200';
console.log(`Starting RSSHub on port ${rsshubPort}...`);
const rsshub = spawn('node', ['node_modules/rsshub/lib/index.js'], {
  env: { ...process.env, PORT: rsshubPort, NODE_ENV: 'dev' },
  stdio: 'inherit',
  shell: true
});

rsshub.on('error', (err) => {
  console.error('Failed to start RSSHub:', err);
});

// Start Backend
const backendPort = process.env.BACKEND_NODE_PORT || '8000';
console.log(`Starting backend on port ${backendPort}...`);

const backend = spawn('node', ['backend-repo/server.js'], {
  env: { ...process.env, BACKEND_NODE_PORT: backendPort },
  stdio: 'inherit',
  shell: true
});

backend.on('error', (err) => {
  console.error('Failed to start backend:', err);
});

// Start Frontend (Next.js dev)
console.log('Starting Next.js frontend...');
const frontend = spawn('npm', ['run', 'dev'], {
  env: { ...process.env },
  stdio: 'inherit',
  shell: true
});

frontend.on('error', (err) => {
  console.error('Failed to start frontend:', err);
});

// Handle exit
process.on('SIGINT', () => {
  console.log('Stopping services...');
  rsshub.kill();
  backend.kill();
  frontend.kill();
  process.exit();
});
