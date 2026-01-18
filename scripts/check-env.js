const path = require('path');
const fs = require('fs');

function loadDotenvFile(filePath) {
  try {
    console.log(`Loading ${filePath}`);
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
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
  } catch (e) { console.error(e) }
}

const repoRoot = path.resolve(__dirname, '..');
loadDotenvFile(path.join(repoRoot, '.env'));

console.log('--- Env Check ---');
console.log('SSH_HOST:', process.env.SSH_HOST);
console.log('SSH_USER:', process.env.SSH_USER ? 'Set (' + process.env.SSH_USER.length + ' chars)' : 'Unset');
console.log('SSH_PASSWORD:', process.env.SSH_PASSWORD ? 'Set (' + process.env.SSH_PASSWORD.length + ' chars)' : 'Unset');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
