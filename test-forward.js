require('dotenv').config({ path: '.env' });
const { Client } = require('ssh2');

const config = {
  host: process.env.SSH_HOST,
  port: process.env.SSH_PORT ? parseInt(process.env.SSH_PORT) : 22,
  username: process.env.SSH_USER,
  password: process.env.SSH_PASSWORD,
};

const dbHost = process.env.SSH_DB_HOST || '127.0.0.1';
const dbPort = process.env.SSH_DB_PORT ? parseInt(process.env.SSH_DB_PORT) : 3306;

console.log(`Testing forwardOut to ${dbHost}:${dbPort} via ${config.host}...`);

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connected.');
  conn.forwardOut('127.0.0.1', 12345, dbHost, dbPort, (err, stream) => {
    if (err) {
      console.error('forwardOut failed:', err);
      conn.end();
      return;
    }
    console.log('forwardOut succeeded! Connection established.');
    stream.end();
    conn.end();
  });
}).on('error', (err) => {
    console.error('SSH Connection Error:', err);
}).connect(config);
