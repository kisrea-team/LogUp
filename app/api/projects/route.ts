import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isDatabaseUnavailableError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: unknown; message?: unknown };
  const name = typeof e.name === 'string' ? e.name : '';
  const message = typeof e.message === 'string' ? e.message : '';
  return name === 'PrismaClientInitializationError' || message.includes("Can't reach database server");
}

// GET /api/projects - Get paginated projects
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '10', 10);

    // Validate page and perPage
    const validPage = Math.max(1, page);
    const validPerPage = Math.max(1, Math.min(100, perPage));

    // Get total count
    const total = await prisma.project.count();

    // Calculate total pages
    const totalPages = Math.ceil(total / validPerPage);

    // Validate page number
    const finalPage = Math.min(validPage, totalPages > 0 ? totalPages : 1);

    // Get paginated projects
    const projects = await prisma.project.findMany({
      skip: (finalPage - 1) * validPerPage,
      take: validPerPage,
      orderBy: {
        latest_update_time: 'desc',
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
      },
    });

    return NextResponse.json({
      data: projects,
      total,
      page: finalPage,
      per_page: validPerPage,
      total_pages: totalPages,
    });
  } catch (error) {
    console.error('Error in GET /api/projects:', error);
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
    const resp = await fetch(`${base}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: { 'Content-Type': resp.headers.get('content-type') || 'application/json; charset=utf-8' },
    });
  } catch (error) {
    console.error('Error in POST /api/projects:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
