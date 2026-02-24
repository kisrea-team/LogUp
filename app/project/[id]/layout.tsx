import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || '';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const where = /^\d+$/.test(id) ? { id: parseInt(id, 10) } : { slug: id };

    const project = await prisma.project
        .findUnique({
            where,
            select: { name: true, describe: true, summar: true, slug: true, author: true, type: true },
        })
        .catch(() => null);

    if (!project) {
        return { title: '项目不存在 | LogUp' };
    }

    const title = `${project.name} 更新日志 | LogUp`;
    const description =
        project.describe || project.summar || `查看 ${project.name} 的版本更新日志和下载链接`;
    const canonical = `${BASE_URL}/project/${project.slug || id}`;
    const keywords = [project.name, project.author, project.type, '更新日志', 'changelog', 'release notes'].filter(
        Boolean
    ) as string[];

    return {
        title,
        description,
        keywords,
        openGraph: {
            title,
            description,
            type: 'article',
            url: canonical,
            siteName: 'LogUp',
        },
        twitter: {
            card: 'summary',
            title,
            description,
        },
        alternates: { canonical },
    };
}

export default function ProjectDetailLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
