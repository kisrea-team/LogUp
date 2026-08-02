import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isDatabaseUnavailableError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: unknown; message?: unknown };
  const name = typeof e.name === 'string' ? e.name : '';
  const message = typeof e.message === 'string' ? e.message : '';
  return name === 'PrismaClientInitializationError' || message.includes("Can't reach database server");
}

const ORDER_BY_MAP: Record<string, object> = {
  updated_desc: { latest_update_time: 'desc' },
  updated_asc: { latest_update_time: 'asc' },
  name_asc: { name: 'asc' },
  name_desc: { name: 'desc' },
  created_desc: { createdAt: 'desc' },
};

// GET /api/projects - Get paginated projects
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '10', 10);
    const search = (searchParams.get('search') || '').trim();
    const nameQuery = (searchParams.get('name') || '').trim();
    const type = (searchParams.get('type') || '').trim();
    const tag = (searchParams.get('tag') || '').trim();
    const sort = searchParams.get('sort') || 'updated_desc';

    const validPage = Math.max(1, page);
    const validPerPage = Math.max(1, Math.min(100, perPage));

    // Build where filter
    const where: Record<string, unknown> = {};
    if (nameQuery) {
      // Fuzzy match on name field only
      where.name = { contains: nameQuery, mode: 'insensitive' };
    } else if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { describe: { contains: search, mode: 'insensitive' } },
        { summar: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (type) {
      where.type = { equals: type, mode: 'insensitive' };
    }
    if (tag) {
      where.tags = { has: tag };
    }

    const orderBy = ORDER_BY_MAP[sort] ?? ORDER_BY_MAP.updated_desc;

    const total = await prisma.project.count({ where: where as never });
    const totalPages = Math.ceil(total / validPerPage);
    const finalPage = Math.min(validPage, totalPages > 0 ? totalPages : 1);

    const projects = await prisma.project.findMany({
      where: where as never,
      skip: (finalPage - 1) * validPerPage,
      take: validPerPage,
      orderBy: orderBy as never,
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
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      icon,
      name,
      slug,
      latest_version,
      latest_update_time,
      describe,
      summar,
      author,
      type,
      tags,
      links,
      update_source_url,
    } = body;

    if (!name || !icon) {
      return NextResponse.json({ error: 'name and icon are required' }, { status: 400 });
    }

    // 自动生成 slug：小写 + 连字符，保留中文
    let finalSlug = slug;
    if (!finalSlug && name) {
      finalSlug = String(name)
        .toLowerCase()
        .replace(/[^a-z0-9一-龥\s-]/g, '')
        .replace(/\s+/g, '-');
    }
    if (!finalSlug) finalSlug = `p-${Date.now()}`;

    const existing = await prisma.project.findUnique({ where: { slug: finalSlug }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        icon,
        name,
        slug: finalSlug,
        latest_version: latest_version || 'v1.0.0',
        latest_update_time: latest_update_time ? new Date(latest_update_time) : new Date(),
        describe: describe ?? null,
        summar: summar ?? null,
        author: author ?? null,
        type: type ?? null,
        tags: Array.isArray(tags) ? tags : [],
        links: Array.isArray(links) ? links : [],
        ...(update_source_url !== undefined ? { update_source_url: update_source_url || null } : {}),
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
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects:', error);
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
