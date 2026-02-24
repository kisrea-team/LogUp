const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper to load .env file manually
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
  } catch (e) { console.error('Failed to load .env:', e); }
}

// Load .env files
const repoRoot = __dirname;
loadDotenvFile(path.join(repoRoot, '.env'));
loadDotenvFile(path.join(repoRoot, '.env.local'));

console.log('Starting production services...');

// 1. Start Backend (on port 8000 by default)
// We force BACKEND_NODE_PORT to 8000 if not set, because Frontend expects it there.
const backendPort = process.env.BACKEND_NODE_PORT || '8000';
const backend = spawn('node', ['backend-repo/server.js'], {
  env: { ...process.env, BACKEND_NODE_PORT: backendPort },
  stdio: 'inherit',
  shell: true
});

backend.on('error', (err) => console.error('Backend failed to start:', err));

// 2. Start Frontend (Next.js)
// In Docker standalone mode, server.js is present in the same directory.
// Otherwise fall back to `npm run start:next`.
const isStandalone = fs.existsSync(path.join(__dirname, 'server.js'));
const frontendArgs = isStandalone
  ? { cmd: 'node', args: ['server.js'], opts: { env: { ...process.env, HOSTNAME: '0.0.0.0' }, stdio: 'inherit', shell: false } }
  : { cmd: 'npm', args: ['run', 'start:next'], opts: { env: { ...process.env }, stdio: 'inherit', shell: true } };

const frontend = spawn(frontendArgs.cmd, frontendArgs.args, frontendArgs.opts);

frontend.on('error', (err) => console.error('Frontend failed to start:', err));

// Handle process termination
const cleanup = () => {
  try {
    backend.kill();
    frontend.kill();
  } catch (e) {
    // Ignore errors during cleanup
  }
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
