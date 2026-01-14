import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/projects/[id]/versions - Get versions for a specific project
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const projectId = parseInt(params.id, 10);

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get versions for the project
    const versions = await prisma.version.findMany({
      where: { project_id: projectId },
      orderBy: {
        update_time: 'desc',
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

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Error in GET /api/projects/[id]/versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}
