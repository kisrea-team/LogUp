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
  } catch {}
}

loadDotenvFile(path.join(process.cwd(), '.env'));
loadDotenvFile(path.join(process.cwd(), '.env.local'));

function encodeUserInfoPart(value) {
  return encodeURIComponent(value ?? '').replace(/%3A/g, ':');
}

function getCfg() {
  const dbHost = process.env.DB_HOST || process.env.DATABASE_HOST;
  const dbPort = process.env.DB_PORT
    ? parseInt(process.env.DB_PORT, 10)
    : process.env.DATABASE_PORT
      ? parseInt(process.env.DATABASE_PORT, 10)
      : 3306;
  const dbUser = process.env.DB_USER || process.env.DATABASE_USERNAME;
  const dbPassword = process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD;
  const dbName = process.env.DB_NAME || process.env.DATABASE_NAME;

  const sshHost = process.env.SSH_HOST || dbHost;
  const sshPort = process.env.SSH_PORT ? parseInt(process.env.SSH_PORT, 10) : 22;
  const sshUser = process.env.SSH_USER;
  const sshPassword = process.env.SSH_PASSWORD;

  const localPort = process.env.SSH_LOCAL_PORT ? parseInt(process.env.SSH_LOCAL_PORT, 10) : 3307;

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
      } catch {}
      try {
        conn.end();
      } catch {}
    };

    socket.on('error', cleanup);

    conn
      .on('ready', () => {
        conn.forwardOut('127.0.0.1', 0, cfg.dbHost, cfg.dbPort, (err, stream) => {
          if (err) return cleanup();
          stream.on('error', cleanup);
          stream.on('close', cleanup);
          socket.pipe(stream);
          stream.pipe(socket);
        });
      })
      .on('error', cleanup)
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
  if (!cfg) return;

  const g = globalThis;
  if (g.__logupSshTunnel && g.__logupSshTunnel.server && g.__logupSshTunnel.port) {
    process.env.DATABASE_URL = buildLocalDatabaseUrl(cfg, g.__logupSshTunnel.port);
    return;
  }

  const port = cfg.localPort;
  process.env.DATABASE_URL = buildLocalDatabaseUrl(cfg, port);

  const server = createForwardingServer(cfg);
  server.on('error', () => {});
  server.listen(port, '127.0.0.1');
  server.unref();
  g.__logupSshTunnel = { server, port };
}

ensureSshTunnel();

module.exports = { ensureSshTunnel };
