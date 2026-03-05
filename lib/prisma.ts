import { PrismaClient } from '@prisma/client';

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return;

  const host = process.env.DB_HOST || process.env.DATABASE_HOST;
  const port = process.env.DB_PORT || process.env.DATABASE_PORT;
  const username = process.env.DB_USER || process.env.DATABASE_USERNAME;
  const password = process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD;
  const database = process.env.DB_NAME || process.env.DATABASE_NAME;
  const schema = process.env.DB_SCHEMA || process.env.DATABASE_SCHEMA;

  if (!host || !port || !username || password === undefined || !database) return;

  const u = encodeURIComponent(username);
  const p = encodeURIComponent(password);
  const d = encodeURIComponent(database);
  const s = schema ? `?schema=${encodeURIComponent(schema)}` : '';
  process.env.DATABASE_URL = `postgresql://${u}:${p}@${host}:${port}/${d}${s}`;
}

ensureDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Pre-warm the connection pool so the first request doesn't bear the full handshake latency
prisma.$connect().catch(() => {});
