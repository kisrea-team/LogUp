import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isDatabaseUnavailableError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: unknown; message?: unknown };
  const name = typeof e.name === 'string' ? e.name : '';
  const message = typeof e.message === 'string' ? e.message : '';
  return name === 'PrismaClientInitializationError' || message.includes("Can't reach database server");
}

// PUT /api/versions/[id] - Update a version
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const id = parseInt(params.id, 10);
    const body = await request.json();
    const { project_id, version, update_time, content, download_url } = body;

    // Check if version exists
    const existingVersion = await prisma.version.findUnique({
      where: { id },
      select: { id: true, project_id: true },
    });

    if (!existingVersion) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Update version
    await prisma.version.updateMany({
      where: { id },
      data: {
        version,
        update_time: update_time ? new Date(update_time) : undefined,
        content,
        download_url,
      },
    });

    // Update project's latest version if this is newer
    if (update_time) {
      const updateDate = new Date(update_time);
      const projectId =
        typeof project_id === 'string'
          ? parseInt(project_id, 10)
          : project_id || existingVersion.project_id;

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, latest_update_time: true },
      });

      if (project && (!project.latest_update_time || updateDate > project.latest_update_time)) {
        await prisma.project.updateMany({
          where: { id: projectId },
          data: { latest_version: version, latest_update_time: updateDate },
        });
      }
    }

    const updatedVersion = await prisma.version.findUnique({
      where: { id },
      select: { id: true, project_id: true, version: true, update_time: true, content: true, download_url: true },
    });

    return NextResponse.json(updatedVersion);
  } catch (error) {
    console.error('Error in PUT /api/versions/[id]:', error);
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }
    return NextResponse.json(
      { error: 'Failed to update version' },
      { status: 500 }
    );
  }
}

// DELETE /api/versions/[id] - Delete a version
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const id = parseInt(params.id, 10);

    // Check if version exists
    const version = await prisma.version.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Delete version
    await prisma.version.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Version deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/versions/[id]:', error);
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }
    return NextResponse.json(
      { error: 'Failed to delete version' },
      { status: 500 }
    );
  }
}
