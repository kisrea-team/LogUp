const { spawn } = require('child_process');

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
// Next.js uses PORT environment variable automatically (set by Azure).
const frontend = spawn('npm', ['run', 'start:next'], {
  env: { ...process.env },
  stdio: 'inherit',
  shell: true
});

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
