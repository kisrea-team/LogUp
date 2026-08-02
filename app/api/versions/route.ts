import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// POST /api/versions - Create a new version, sync project.latest_version if newer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { project_id, version, update_time, content, download_url } = body;

    if (!project_id || !version) {
      return NextResponse.json({ error: 'project_id and version are required' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: project_id },
      select: { id: true, latest_update_time: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const newVersion = await prisma.version.create({
      data: {
        project_id,
        version,
        update_time: update_time ? new Date(update_time) : new Date(),
        content: content || '',
        download_url: download_url || '',
      },
      select: {
        id: true,
        project_id: true,
        version: true,
        update_time: true,
        content: true,
        download_url: true,
      },
    });

    // 若新版本比项目最新版本更新，同步 latest_version / latest_update_time
    if (update_time) {
      const updateDate = new Date(update_time);
      if (!project.latest_update_time || updateDate > project.latest_update_time) {
        await prisma.project.updateMany({
          where: { id: project_id },
          data: { latest_version: version, latest_update_time: updateDate },
        });
      }
    }

    return NextResponse.json(newVersion, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/versions:', error);
    return NextResponse.json({ error: 'Failed to create version' }, { status: 500 });
  }
}
