/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2025-08-30
 * @FilePath: /LogUp/components/ProjectList.tsx
 * Helllllloo!
 */
import React from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card } from './ui/card';
import ListClassify from './asset/Listclassify';

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

const ProjectList: React.FC<ProjectListProps> = ({ projects }) => {
    const router = useRouter();

    const handleProjectClick = (project: Project) => {
        router.push(`/project/${project.id}`);
    };
    return (
        <main className="projectlist">
            <ListClassify />
            <div>
                <div className="projectlist-content">
                    {projects.map((project) => (
                        <Card
                            key={project.id}
                            id="card"
                            onClick={() => handleProjectClick(project)}
                        >
                            <div className="text-3xl">{project.icon}</div>
                            <div className="flex-col">
                                <div className="flex items-start gap-2">
                                    <div>
                                        <div className="flex">
                                            <p className="font-medium">{project.name}</p>
                                            <span className="text-datail px-0.5">——</span>
                                            <p className="text-datail">
                                                {project.summar || '暂无简介'}
                                            </p>
                                        </div>
                                        <p className="text-sm text-datail">
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
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div>
                                            <span>{project.author || 'vhko'}</span>|
                                            <span>{project.type || '未分类'}</span>
                                        </div>
                                        <div className="ml-auto">{project.latest_update_time}</div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
            <Card className="projectlist-about">
                <h1>hello</h1>
            </Card>
        </main>
    );
};

export default ProjectList;
