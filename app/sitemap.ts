import { prisma } from '@/lib/prisma';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || '';

    const projects = await prisma.project
        .findMany({
            select: { id: true, slug: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
        })
        .catch(() => []);

    return [
        {
            url: BASE_URL || '/',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        ...projects.map((p) => ({
            url: `${BASE_URL}/project/${p.slug || p.id}`,
            lastModified: p.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        })),
    ];
}
