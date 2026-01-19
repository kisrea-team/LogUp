const path = require('path');
const fs = require('fs');

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
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch { }
}

const repoRoot = path.resolve(__dirname, '..');
loadDotenvFile(path.join(repoRoot, '.env'));

console.log('--- Env Port Check ---');
console.log('SSH_LOCAL_PORT raw:', process.env.SSH_LOCAL_PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL);

if (process.env.DATABASE_URL) {
    try {
        const url = new URL(process.env.DATABASE_URL.replace(/^"+|"+$/g, ''));
        console.log('Parsed DATABASE_URL port:', url.port);
    } catch(e) {
        console.log('Invalid DATABASE_URL');
    }
}
