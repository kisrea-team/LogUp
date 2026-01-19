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
  console.log('[SSH-Tunnel] Config Resolution:');
  console.log('  SSH_HOST (env):', process.env.SSH_HOST);
  console.log('  DATABASE_URL host:', parsed?.host);
  console.log('  Resolved sshHost:', sshHost);

  const sshPort = process.env.SSH_PORT ? parseInt(process.env.SSH_PORT, 10) : 22;
  const sshUser = process.env.SSH_USER;
  const sshPassword = process.env.SSH_PASSWORD;

  let localPort = process.env.SSH_LOCAL_PORT
    ? parseInt(process.env.SSH_LOCAL_PORT, 10)
    : parsed?.port
      ? parsed.port
      : 3307;

  // Safety check for port range
  if (!Number.isInteger(localPort) || localPort < 0 || localPort >= 65536) {
    console.warn(`Invalid SSH_LOCAL_PORT or DATABASE_URL port detected: ${localPort}. Resetting to 3307.`);
    localPort = 3307;
  }

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

  console.log(`[SSH-Tunnel] Target Database: ${dbHost}:${dbPort} (via SSH: ${sshHost})`);

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

  let sshClient = new Client();
  let sshReady = false;
  let connectionPromise = null;

  function connectSSH() {
    if (connectionPromise) return connectionPromise;

    connectionPromise = new Promise((resolve) => {
      console.log(`[SSH-Tunnel] Connecting to SSH server ${cfg.sshHost}...`);

      const onReady = () => {
        console.log('[SSH-Tunnel] SSH connection established.');
        sshReady = true;
        resolve(true);
      };

      const onError = (err) => {
        console.error('[SSH-Tunnel] SSH connection error:', err.message);
        sshReady = false;
        connectionPromise = null;
        try { sshClient.end(); } catch { }
        sshClient = new Client(); // Replace with fresh client
        resolve(false);
      };

      const onEnd = () => {
        console.warn('[SSH-Tunnel] SSH connection ended.');
        sshReady = false;
        connectionPromise = null;
        sshClient = new Client();
        resolve(false);
      };

      sshClient.once('ready', onReady);
      sshClient.once('error', onError);
      sshClient.once('end', onEnd);
      sshClient.once('close', onEnd);

      try {
        sshClient.connect({
          host: cfg.sshHost,
          port: cfg.sshPort,
          username: cfg.sshUser,
          password: cfg.sshPassword,
          readyTimeout: 20000,
          keepaliveInterval: 10000,
          keepaliveCountMax: 3,
        });
      } catch (e) {
        onError(e);
      }
    });
    return connectionPromise;
  }

  // Initial connection
  connectSSH();

  return net.createServer(async (socket) => {
    // Ensure SSH is connected
    if (!sshReady) {
      console.log('[SSH-Tunnel] SSH not ready, reconnecting...');
      const ok = await connectSSH();
      if (!ok) {
        console.error('[SSH-Tunnel] Failed to establish SSH connection for incoming request.');
        socket.destroy();
        return;
      }
    }

    sshClient.forwardOut('127.0.0.1', socket.remotePort, cfg.dbHost, cfg.dbPort, (err, stream) => {
      if (err) {
        const code = err && err.code ? String(err.code) : '';
        const msg = err && err.message ? String(err.message) : String(err);
        console.error(`SSH tunnel forwardOut failed${code ? ` (${code})` : ''}: ${msg}`);
        // If forwardOut fails (e.g. broken pipe), maybe the SSH connection is dead?
        // Trigger a check or reconnect for next time?
        if (code === 'ECONNRESET' || code === 'EPIPE' || !sshClient.writable) {
          sshReady = false;
          connectionPromise = null;
        }
        socket.destroy();
        return;
      }

      stream.on('close', () => socket.destroy());
      socket.on('close', () => stream.end());
      socket.on('error', () => stream.end());
      stream.on('error', () => socket.destroy());

      socket.pipe(stream);
      stream.pipe(socket);
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

  // Prevent re-entry or race conditions during build
  if (g.__logupSshTunnel) {
    const p = g.__logupSshTunnel.port || cfg.localPort;
    process.env.DATABASE_URL = buildLocalDatabaseUrl(cfg, p);
    return;
  }

  // Set lock immediately
  const port = cfg.localPort;
  g.__logupSshTunnel = { status: 'starting', port };
  process.env.DATABASE_URL = buildLocalDatabaseUrl(cfg, port);

  const server = createForwardingServer(cfg);
  server.once('listening', () => {
    console.log(`SSH Tunnel listening on 127.0.0.1:${port}, forwarding to ${cfg.dbHost}:${cfg.dbPort}`);
    g.__logupSshTunnel = { server, port, status: 'listening' };
    // process.env.DATABASE_URL is already set
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`SSH Tunnel warning: Port ${port} is already in use.`);

      // Try to verify if the existing tunnel works
      const testSocket = new net.Socket();
      testSocket.setTimeout(2000);

      testSocket.on('connect', () => {
        console.log(`[SSH-Tunnel] Successfully connected to existing tunnel at port ${port}. Assuming it is valid.`);
        testSocket.destroy();
        g.__logupSshTunnel = { status: 'external', port };
      });

      testSocket.on('error', (e) => {
        console.warn(`[SSH-Tunnel] Port ${port} is in use but connection failed: ${e.message}. This might be a zombie process.`);
        // We can't easily kill it from here safely without risk. 
        // But we should warn loudly.
        g.__logupSshTunnel = { status: 'external', port };
      });

      testSocket.on('timeout', () => {
        console.warn(`[SSH-Tunnel] Port ${port} is in use but timed out. This might be a zombie process.`);
        testSocket.destroy();
        g.__logupSshTunnel = { status: 'external', port };
      });

      testSocket.connect(port, '127.0.0.1');

    } else {
      const code = err && err.code ? String(err.code) : '';
      const msg = err && err.message ? String(err.message) : String(err);
      console.error(`SSH tunnel server failed to start${code ? ` (${code})` : ''}: ${msg}`);
      g.__logupSshTunnel = null; // Reset on fatal error
    }
  });
  server.listen(port, '127.0.0.1');
  server.unref();
}

ensureSshTunnel();

module.exports = { ensureSshTunnel };
