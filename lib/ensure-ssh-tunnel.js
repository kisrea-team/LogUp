const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

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
loadDotenvFile(path.join(repoRoot, '.env.local'));
loadDotenvFile(path.join(process.cwd(), '.env'));
loadDotenvFile(path.join(process.cwd(), '.env.local'));

function encodeUserInfoPart(value) {
  return encodeURIComponent(value ?? '').replace(/%3A/g, ':');
}

function tryParseMysqlUrl(value) {
  try {
    if (!value) return null;
    const url = new URL(String(value).replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, ''));
    if (!url.username && !url.hostname) return null;
    return {
      user: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      host: url.hostname || undefined,
      port: url.port ? parseInt(url.port, 10) : undefined,
      database: url.pathname ? decodeURIComponent(url.pathname.replace(/^\//, '')) : undefined,
    };
  } catch {
    return null;
  }
}

function getCfg() {
  const parsed = tryParseMysqlUrl(process.env.DATABASE_URL);

  const sshHost = process.env.SSH_HOST || process.env.DB_HOST || process.env.DATABASE_HOST || parsed?.host;
  const sshPort = process.env.SSH_PORT ? parseInt(process.env.SSH_PORT, 10) : 22;
  const sshUser = process.env.SSH_USER;
  const sshPassword = process.env.SSH_PASSWORD;

  const localPort = process.env.SSH_LOCAL_PORT
    ? parseInt(process.env.SSH_LOCAL_PORT, 10)
    : parsed?.port
      ? parsed.port
      : 3307;

  let dbHost = process.env.SSH_DB_HOST || process.env.DB_HOST || process.env.DATABASE_HOST || parsed?.host;
  let dbPort = process.env.SSH_DB_PORT
    ? parseInt(process.env.SSH_DB_PORT, 10)
    : process.env.DB_PORT
      ? parseInt(process.env.DB_PORT, 10)
      : process.env.DATABASE_PORT
        ? parseInt(process.env.DATABASE_PORT, 10)
        : parsed?.port
          ? parsed.port
          : 3306;

  const dbUser = process.env.DB_USER || process.env.DATABASE_USERNAME || parsed?.user;
  const dbPassword = process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || parsed?.password;
  const dbName = process.env.DB_NAME || process.env.DATABASE_NAME || parsed?.database;

  if (!process.env.SSH_DB_HOST && sshHost && dbHost && dbHost === sshHost) {
    dbHost = '127.0.0.1';
  }

  if (!dbHost || !dbUser || dbPassword === undefined || !dbName) return null;
  if (!sshHost || !sshUser || !sshPassword) return null;
  if (process.env.DISABLE_SSH_TUNNEL === 'true') return null;

  return {
    dbHost,
    dbPort,
    dbUser,
    dbPassword,
    dbName,
    sshHost,
    sshPort,
    sshUser,
    sshPassword,
    localPort,
  };
}

function buildLocalDatabaseUrl(cfg, localPort) {
  const user = encodeUserInfoPart(cfg.dbUser);
  const pass = encodeUserInfoPart(cfg.dbPassword);
  const name = encodeURIComponent(cfg.dbName);
  return `mysql://${user}:${pass}@127.0.0.1:${localPort}/${name}`;
}

function createForwardingServer(cfg) {
  const { Client } = require('ssh2');

  return net.createServer((socket) => {
    const conn = new Client();
    let closed = false;

    const cleanup = () => {
      if (closed) return;
      closed = true;
      try {
        socket.destroy();
      } catch { }
      try {
        conn.end();
      } catch { }
    };

    socket.on('error', cleanup);

    conn
      .on('ready', () => {
        conn.forwardOut('127.0.0.1', 0, cfg.dbHost, cfg.dbPort, (err, stream) => {
          if (err) {
            const code = err && err.code ? String(err.code) : '';
            const msg = err && err.message ? String(err.message) : String(err);
            console.error(`SSH tunnel forwardOut failed${code ? ` (${code})` : ''}: ${msg}`);
            return cleanup();
          }
          stream.on('error', cleanup);
          stream.on('close', cleanup);
          socket.pipe(stream);
          stream.pipe(socket);
        });
      })
      .on('error', (err) => {
        const code = err && err.code ? String(err.code) : '';
        const msg = err && err.message ? String(err.message) : String(err);
        console.error(`SSH client error${code ? ` (${code})` : ''}: ${msg}`);
        cleanup();
      })
      .connect({
        host: cfg.sshHost,
        port: cfg.sshPort,
        username: cfg.sshUser,
        password: cfg.sshPassword,
        readyTimeout: 15000,
        keepaliveInterval: 10000,
        keepaliveCountMax: 3,
      });
  });
}

function ensureSshTunnel() {
  const cfg = getCfg();
  if (!cfg) {
    const parsed = tryParseMysqlUrl(process.env.DATABASE_URL);
    const looksLikeLocal = parsed && (parsed.host === '127.0.0.1' || parsed.host === 'localhost');
    const disabled = process.env.DISABLE_SSH_TUNNEL === 'true';
    const missing = [];
    if (!process.env.SSH_HOST && !process.env.DB_HOST && !process.env.DATABASE_HOST && !parsed?.host) missing.push('SSH_HOST');
    if (!process.env.SSH_USER) missing.push('SSH_USER');
    if (!process.env.SSH_PASSWORD) missing.push('SSH_PASSWORD');
    if (looksLikeLocal && !disabled && missing.length > 0) {
      console.error(`SSH tunnel not started (missing ${missing.join(', ')}), but DATABASE_URL points to localhost.`);
    }
    return;
  }

  const g = globalThis;
  if (g.__logupSshTunnel && g.__logupSshTunnel.server && g.__logupSshTunnel.port) {
    process.env.DATABASE_URL = buildLocalDatabaseUrl(cfg, g.__logupSshTunnel.port);
    return;
  }

  const port = cfg.localPort;
  const server = createForwardingServer(cfg);
  server.once('listening', () => {
    g.__logupSshTunnel = { server, port };
    process.env.DATABASE_URL = buildLocalDatabaseUrl(cfg, port);
  });
  server.on('error', (err) => {
    const code = err && err.code ? String(err.code) : '';
    const msg = err && err.message ? String(err.message) : String(err);
    console.error(`SSH tunnel server failed to start${code ? ` (${code})` : ''}: ${msg}`);
  });
  server.listen(port, '127.0.0.1');
  server.unref();
}

ensureSshTunnel();

module.exports = { ensureSshTunnel };
