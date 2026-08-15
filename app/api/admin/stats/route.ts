import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unauthorizedIfNotAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/stats - admin 仪表盘真实统计
export async function GET(request: Request) {
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;
  try {
    const [projectsCount, versionsCount, aiProviders, recentProjects, recentVersions, recentOps] = await Promise.all([
      prisma.project.count(),
      prisma.version.count(),
      prisma.aiProvider.count(),
      prisma.project.findMany({
        orderBy: { latest_update_time: 'desc' },
        take: 8,
        select: { id: true, icon: true, name: true, latest_version: true, latest_update_time: true },
      }),
      prisma.version.findMany({
        orderBy: { update_time: 'desc' },
        take: 8,
        select: {
          id: true,
          version: true,
          update_time: true,
          project: { select: { id: true, name: true, icon: true } },
        },
      }),
      prisma.opRun.findMany({ orderBy: { id: 'desc' }, take: 8 }),
    ]);

    return NextResponse.json({
      success: true,
      projects_count: projectsCount,
      versions_count: versionsCount,
      ai_providers_count: aiProviders,
      recent_projects: recentProjects,
      recent_versions: recentVersions,
      recent_ops: recentOps,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/stats:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
