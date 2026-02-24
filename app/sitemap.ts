import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const headersList = await headers();
    const host = headersList.get('host') || '';
    const proto = headersList.get('x-forwarded-proto') || 'https';
    const BASE_URL = (
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.BASE_URL ||
        (host ? `${proto}://${host}` : '')
    ).replace(/\/$/, '');

    const projects = await prisma.project
        .findMany({
            select: { id: true, slug: true, latest_update_time: true },
            orderBy: { latest_update_time: 'desc' },
        })
        .catch(() => []);

    return [
        {
            url: `${BASE_URL}/`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        ...projects.map((p) => ({
            url: `${BASE_URL}/project/${p.slug || p.id}`,
            lastModified: p.latest_update_time,
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        })),
    ];
}
