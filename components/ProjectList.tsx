/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2025-09-15
 * @FilePath: /LogUp/components/ProjectList.tsx
 * Helllllloo!
 */
import React from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card } from './ui/card';
import ListClassify from './asset/Listclassify';
import { RenderIcon } from './utils/renderIcon';

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
        <main className="projectlist">
            <ListClassify />
            <div>
                <div className="projectlist-content">
                    {(projects || []).length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">暂无项目数据</p>
                        </div>
                    ) : (projects || []).map((project) => (
                        <Card
                            key={project.id}
                            id="card"
                            className="grid rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleProjectClick(project)}
                        >
                            {/* <div className="text-3xl">{project.icon}</div> */}
                            <div className="text-3xl">
                                {/* {project.icon.trim().startsWith('<svg') ? (
                                    <p dangerouslySetInnerHTML={{ __html: project.icon }} />
                                ) : (
                                    <span>{project.icon}</span>
                                )} */}
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
