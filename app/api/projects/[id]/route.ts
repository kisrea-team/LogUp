import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unauthorizedIfNotAdmin } from '@/lib/auth';

function isDatabaseUnavailableError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: unknown; message?: unknown };
  const name = typeof e.name === 'string' ? e.name : '';
  const message = typeof e.message === 'string' ? e.message : '';
  return name === 'PrismaClientInitializationError' || message.includes("Can't reach database server");
}

// GET /api/projects/[id] - Get a single project with versions
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const idOrSlug = params.id;

    const where = /^\d+$/.test(idOrSlug)
      ? { id: parseInt(idOrSlug, 10) }
      : { slug: idOrSlug };

    const project = await prisma.project.findUnique({
      where,
      select: {
        id: true,
        icon: true,
        name: true,
        slug: true,
        latest_version: true,
        latest_update_time: true,
        describe: true,
        summar: true,
        author: true,
        type: true,
        tags: true,
        links: true,
        update_source_url: true,
        version_regex: true,
        versions: {
          orderBy: { update_time: 'desc' },
          select: {
            id: true,
            project_id: true,
            version: true,
            update_time: true,
            content: true,
            download_url: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error in GET /api/projects/[id]:', error);
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;

  try {
    const id = parseInt(params.id, 10);
    const body = await request.json();
    const { icon, name, latest_version, latest_update_time, describe, summar, author, type, tags, links, update_source_url, version_regex } = body;

    const project = await prisma.project.update({
      where: { id },
      data: {
        icon,
        name,
        latest_version,
        latest_update_time: latest_update_time ? new Date(latest_update_time) : undefined,
        describe,
        summar,
        author,
        type,
        ...(Array.isArray(tags) ? { tags } : {}),
        ...(Array.isArray(links) ? { links } : {}),
        ...(update_source_url !== undefined ? { update_source_url: update_source_url || null } : {}),
        ...(version_regex !== undefined ? { version_regex: version_regex || null } : {}),
      },
      select: {
        id: true,
        icon: true,
        name: true,
        slug: true,
        latest_version: true,
        latest_update_time: true,
        describe: true,
        summar: true,
        author: true,
        type: true,
        tags: true,
        links: true,
        update_source_url: true,
        version_regex: true,
        versions: {
          orderBy: { update_time: 'desc' },
          select: {
            id: true,
            project_id: true,
            version: true,
            update_time: true,
            content: true,
            download_url: true,
          },
        },
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error in PUT /api/projects/[id]:', error);
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const denied = await unauthorizedIfNotAdmin(request);
  if (denied) return denied;

  try {
    const id = parseInt(params.id, 10);

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]:', error);
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
