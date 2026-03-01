import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isDatabaseUnavailableError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: unknown; message?: unknown };
  const name = typeof e.name === 'string' ? e.name : '';
  const message = typeof e.message === 'string' ? e.message : '';
  return name === 'PrismaClientInitializationError' || message.includes("Can't reach database server");
}

// GET /api/projects/count - Get total project count
export async function GET() {
  try {
    const total = await prisma.project.count();
    return NextResponse.json({ total });
  } catch (error) {
    console.error('Error in GET /api/projects/count:', error);
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to count projects' }, { status: 500 });
  }
}
