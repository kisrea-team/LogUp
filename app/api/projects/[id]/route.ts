import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/projects/[id] - Get a single project with versions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    const body = await request.json();
    const { icon, name, latest_version, latest_update_time, describe, summar, author, type } = body;

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
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
