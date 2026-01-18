/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2025-11-24
 * @FilePath: /LogUp/components/ProjectList.tsx
 * Helllllloo!
 */
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RenderIcon } from './utils/renderIcon';
import { ThumbsUp, MessageCircle } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

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
    versions: Version[];
}

interface ProjectListProps {
    projects: Project[];
}

const ProjectList: React.FC<ProjectListProps> = ({ projects = [] }) => {
    const router = useRouter();

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
                                className=" hover:bg-blue-200 "
                                onClick={() => handleProjectClick(project)}
                            >
                                <div className="text-3xl">
                                    <RenderIcon icon={project.icon} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-start gap-2">
                                        <div className="flex-1">
                                            <div className="flex items-center">
                                                <p className="font-medium">{project.name}</p>
                                                <span className="text-detail px-0.5">——</span>
                                                <p className="text-detail">
                                                    {project.summar || '暂无简介'}
                                                </p>
                                            </div>
                                            <p className="text-sm text-detail">
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
                                    <div className="mt-2 space-y-1">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
                                            <div>
                                                <span>{project.author || 'vhko'}</span>
                                                <span className="mx-1">|</span>
                                                <span>{project.type || '未分类'}</span>
                                            </div>
                                            <div className="sm:ml-auto">
                                                {formatRelativeTime(project.latest_update_time)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
            <aside className="projectlist-aside">
                <h1 className="text-title font-bold">近日更新</h1>
                <div className="text-small gap-2 flex-col">
                    <a className="flex">
                        {/* <Annoyed /> */}
                        <span>项目名称</span>
                    </a>
                    <p className="text-default">更新了有关XXX的功能，</p>
                    <div>
                        <Button variant="ghost">
                            <ThumbsUp />
                            999+
                        </Button>
                        <Button>
                            <MessageCircle />
                            30
                        </Button>
                    </div>
                </div>
            </aside>
        </main>
    );
};

export default ProjectList;
