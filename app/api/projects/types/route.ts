import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/projects/types - Return distinct non-empty project types
export async function GET() {
  try {
    const rows = await prisma.project.groupBy({
      by: ['type'],
      where: { type: { not: null } },
      orderBy: { type: 'asc' },
    });
    const types = rows
      .map((r) => r.type)
      .filter((t): t is string => typeof t === 'string' && t.trim() !== '');
    return NextResponse.json({ types });
  } catch {
    return NextResponse.json({ types: [] });
  }
}
