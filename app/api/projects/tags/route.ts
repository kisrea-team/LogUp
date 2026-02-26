import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/projects/tags - Return all distinct tags across projects
export async function GET() {
  try {
    const rows = await prisma.$queryRaw<{ tag: string }[]>`
      SELECT DISTINCT unnest(tags) AS tag
      FROM projects
      WHERE array_length(tags, 1) > 0
      ORDER BY tag ASC
    `;
    const tags = rows.map((r) => r.tag).filter((t) => t && t.trim() !== '');
    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json({ tags: [] });
  }
}
