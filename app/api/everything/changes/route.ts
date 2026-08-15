import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/everything/changes - 最近版本更新动态（首页侧栏）
export async function GET(request: NextRequest) {
  try {
    const limitParam = request.nextUrl.searchParams.get('limit') || '50';
    const limit = Math.max(1, Math.min(200, parseInt(limitParam, 10) || 50));

    const changes = await prisma.version.findMany({
      take: limit,
      orderBy: { update_time: 'desc' },
      select: {
        id: true,
        project_id: true,
        version: true,
        update_time: true,
        content: true,
        download_url: true,
        project: {
          select: {
            id: true,
            icon: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: changes });
  } catch (error) {
    console.error('Error in GET /api/everything/changes:', error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
