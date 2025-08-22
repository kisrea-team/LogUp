/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2025-08-22
 * @FilePath: /LogUp/components/ProjectList.tsx
 * Helllllloo!
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from './ui/card';

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
    onProjectClick: (project: Project) => void;
}
// const ProjectList = () => {
const ProjectList: React.FC<ProjectListProps> = ({ projects, onProjectClick }) => {
    return (
        <main className="flex gap-4 max-w-md-1k mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card className="flex flex-col projectlist-classify">
                <p className=" mx-auto">分类</p>
            </Card>
            <div className="projectlist">
                <div className="rounded-lg" id="list">
                    {projects.map((project) => (
                        <Card
                            key={project.id}
                            className="projectlist-card hover:shadow-md transition-shadow "
                            onClick={() => onProjectClick(project)}
                        >
                            <div className="text-3xl">{project.icon}</div>
                            <div className="flex-col ">
                                <div className="flex items-start gap-2">
                                    <div>
                                        <div className="flex">
                                            <p className="font-medium">{project.name}</p>
                                            <span className="text-gray-400 px-0.5">——</span>
                                            <p className="text-gray-400">
                                                {project.summar || '暂无简介'}
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-700">
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

                {/* {projects.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">暂无项目数据</p>
                    </div>
                )} */}
            </div>
        </main>
    );
};

export default ProjectList;
