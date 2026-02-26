/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2026-02-26
 * @FilePath: /LogUp/components/ProjectList.tsx
 * Helllllloo!
 */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { RenderIcon } from './utils/renderIcon';
import { formatRelativeTime } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

interface Version {
    id?: number;
    project_id?: number;
    version: string;
    update_time: string;
    content: string;
    download_url: string;
    downloadUrl?: string;
}

interface Project {
    id: number;
    icon: string;
    name: string;
    slug?: string;
    latest_version: string;
    latest_update_time: string;
    describe?: string;
    summar?: string;
    author?: string;
    type?: string;
    tags?: string[];
    versions: Version[];
}

interface RecentChange {
    id: number;
    version: string;
    update_time: string;
    project: {
        id: number;
        icon: string;
        name: string;
        slug?: string;
    };
}

interface ProjectListProps {
    projects: Project[];
    onTagClick?: (tag: string) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects = [], onTagClick }) => {
    const router = useRouter();
    const [recentChanges, setRecentChanges] = useState<RecentChange[]>([]);

    useEffect(() => {
        apiFetch('/everything/changes?limit=8')
            .then((r) => r.json())
            .then((d) => {
                if (Array.isArray(d?.data)) setRecentChanges(d.data);
            })
            .catch(() => {});
    }, []);

    const handleProjectClick = (project: Project) => {
        router.push(`/project/${project.slug || project.id}`);
    };

    return (
        <main className="projectlist max-w-layout">
            <div className="projectlist-content">
                {(projects || []).length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="text-center py-12"
                    >
                        <p className="text-gray-500">暂无项目数据</p>
                    </motion.div>
                ) : (
                    (projects || []).map((project, index) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div
                                id="card"
                                className="hover:bg-gray-50 hover:dark:bg-zinc-800 "
                                onClick={() => handleProjectClick(project)}
                            >
                                <div className="">
                                    <RenderIcon icon={project.icon} />
                                </div>
                                <div className="flex flex-col gap-5">
                                    <div className="flex items-start gap-2">
                                        <div className="">
                                            <div className="flex items-center">
                                                <p className="font-medium">{project.name}</p>
                                                <span className=" px-0.5">——</span>
                                                <p className="">{project.summar || '暂无简介'}</p>
                                            </div>
                                            <p className="text-sm ">
                                                {project.describe || '暂无详细描述'}
                                            </p>
                                        </div>
                                        <Badge
                                            variant="blue"
                                            className="ml-auto projectlist-version-tag"
                                        >
                                            {project.latest_version}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex gap-2 text-l text-gray-500">
                                            <div>
                                                <span>{project.author || 'vhko'}</span>
                                                <span className="mx-1">|</span>
                                                <span>{project.type || '未分类'}</span>
                                            </div>
                                            <div className="sm:ml-auto">
                                                {formatRelativeTime(project.latest_update_time)}
                                            </div>
                                        </div>
                                        {project.tags && project.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                                                {project.tags.map((tag) => (
                                                    <button
                                                        key={tag}
                                                        onClick={() => onTagClick?.(tag)}
                                                        className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900 dark:hover:text-blue-200 transition-colors"
                                                    >
                                                        #{tag}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
            <aside className="projectlist-aside">
                <div className="flex items-center gap-2 mb-3">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    <h2 className="text-sm font-semibold">近日更新</h2>
                    <span className="text-xs text-green-500 font-medium">Live</span>
                </div>
                <div className="flex flex-col gap-3">
                    {recentChanges.length === 0 ? (
                        <p className="text-xs text-gray-400">暂无更新</p>
                    ) : (
                        recentChanges.map((change) => (
                            <button
                                key={change.id}
                                onClick={() => router.push(`/project/${change.project.slug || change.project.id}`)}
                                className="flex items-start gap-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-md p-1.5 -mx-1.5 transition-colors w-full"
                            >
                                <span className="shrink-0 mt-0.5">
                                    <RenderIcon icon={change.project.icon} size={20} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium truncate">{change.project.name}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Badge variant="blue" className="text-[10px] px-1.5 py-0">
                                            {change.version}
                                        </Badge>
                                        <span className="text-[10px] text-gray-400">
                                            {formatRelativeTime(change.update_time)}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </aside>
        </main>
    );
};

export default ProjectList;
