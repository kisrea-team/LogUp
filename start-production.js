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
  } catch (e) {
    console.error('Failed to load .env:', e);
  }
}

// Load .env files
const repoRoot = __dirname;
loadDotenvFile(path.join(repoRoot, '.env'));
loadDotenvFile(path.join(repoRoot, '.env.local'));

console.log('Starting production Next.js server...');

// In Docker standalone mode, server.js is present in the same directory.
// Otherwise fall back to `npm run start:next`.
const isStandalone = fs.existsSync(path.join(__dirname, 'server.js'));
const args = isStandalone
  ? { cmd: 'node', args: ['server.js'], opts: { env: { ...process.env, HOSTNAME: '0.0.0.0' }, stdio: 'inherit', shell: false } }
  : { cmd: 'npm', args: ['run', 'start:next'], opts: { env: { ...process.env }, stdio: 'inherit', shell: true } };

const frontend = spawn(args.cmd, args.args, args.opts);
frontend.on('error', (err) => console.error('Frontend failed to start:', err));

// Handle process termination
const cleanup = () => {
  try {
    frontend.kill();
  } catch (e) {
    // Ignore errors during cleanup
  }
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
