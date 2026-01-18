
const { ensureSshTunnel } = require('./lib/ensure-ssh-tunnel');
const mysql = require('mysql2/promise');

async function fixData() {
  console.log('Starting data fix via mysql2...');
  
  // ensure-ssh-tunnel sets process.env.DATABASE_URL to the local tunnelled address
  // Note: ensureSshTunnel is synchronous in its setup, but the server starts listening.
  // We need to wait a bit for the tunnel to be ready? usually it's fast.
  
  // The module require already triggered ensureSshTunnel().
  
  const dbUrl = process.env.DATABASE_URL;
  console.log('Using database URL:', dbUrl);
  
  if (!dbUrl) {
    console.error('DATABASE_URL is not set.');
    return;
  }

  try {
    const connection = await mysql.createConnection(dbUrl);
    console.log('Connected to database!');

    // Fix Project table
    console.log('Fixing NULL created_at in projects table...');
    const [resProjects] = await connection.execute('UPDATE projects SET created_at = NOW() WHERE created_at IS NULL');
    console.log('Fixed projects:', resProjects);

    // Fix Version table
    console.log('Fixing NULL created_at in versions table...');
    const [resVersions] = await connection.execute('UPDATE versions SET created_at = NOW() WHERE created_at IS NULL');
    console.log('Fixed versions:', resVersions);

    // Also fix updated_at if needed
    await connection.execute('UPDATE projects SET updated_at = NOW() WHERE updated_at IS NULL');
    await connection.execute('UPDATE versions SET updated_at = NOW() WHERE updated_at IS NULL');
    
    console.log('Data fix completed successfully!');
    await connection.end();

  } catch (error) {
    console.error('Data fix failed:', error);
  } finally {
    // Force exit
    setTimeout(() => process.exit(0), 1000);
  }
}

fixData();
