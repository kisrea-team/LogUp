
// ensure-ssh-tunnel will load .env files automatically when required
const { ensureSshTunnel } = require('./lib/ensure-ssh-tunnel');
const { PrismaClient } = require('@prisma/client');

async function fixData() {
  console.log('Attempting to fix database data...');
  
  const prisma = new PrismaClient();

  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Successfully connected to database!');
    
    // Fix Project table
    console.log('Fixing NULL created_at in projects table...');
    const resultProjects = await prisma.$executeRaw`UPDATE projects SET created_at = NOW() WHERE created_at IS NULL`;
    console.log('Fixed projects:', resultProjects);

    // Fix Version table
    console.log('Fixing NULL created_at in versions table...');
    const resultVersions = await prisma.$executeRaw`UPDATE versions SET created_at = NOW() WHERE created_at IS NULL`;
    console.log('Fixed versions:', resultVersions);

    // Also fix updated_at if needed
    await prisma.$executeRaw`UPDATE projects SET updated_at = NOW() WHERE updated_at IS NULL`;
    await prisma.$executeRaw`UPDATE versions SET updated_at = NOW() WHERE updated_at IS NULL`;
    
    console.log('Data fix completed successfully!');

  } catch (error) {
    console.error('Data fix failed:', error);
  } finally {
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 1000);
  }
}

fixData();
