const { ensureSshTunnel } = require('./lib/ensure-ssh-tunnel');

console.log('Starting tunnel test...');
ensureSshTunnel();

// Keep alive
setInterval(() => {}, 1000);
