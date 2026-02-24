
const { PrismaClient } = require('@prisma/client');

async function fixData() {
  console.log('Starting data fix via Prisma...');

  const dbUrl = process.env.DATABASE_URL;
  console.log('Using database URL:', dbUrl);
  
  if (!dbUrl) {
    console.error('DATABASE_URL is not set.');
    return;
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('Connected to database.');

    // Fix Project table
    console.log('Fixing NULL created_at in projects table...');
    const resProjects = await prisma.$executeRaw`UPDATE projects SET created_at = NOW() WHERE created_at IS NULL`;
    console.log('Fixed projects:', resProjects);

    // Fix Version table
    console.log('Fixing NULL created_at in versions table...');
    const resVersions = await prisma.$executeRaw`UPDATE versions SET created_at = NOW() WHERE created_at IS NULL`;
    console.log('Fixed versions:', resVersions);

    // Also fix updated_at if needed
    await prisma.$executeRaw`UPDATE projects SET updated_at = NOW() WHERE updated_at IS NULL`;
    await prisma.$executeRaw`UPDATE versions SET updated_at = NOW() WHERE updated_at IS NULL`;
    
    console.log('Data fix completed successfully!');

  } catch (error) {
    console.error('Data fix failed:', error);
  } finally {
    await prisma.$disconnect();
    // Force exit
    setTimeout(() => process.exit(0), 1000);
  }
}

fixData();
