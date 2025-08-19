/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2025-08-19
 * @FilePath: /LogUp/components/ProjectList.tsx
 * Helllllloo!
 */
import React from 'react';
import './assets.css';
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
    versions: Version[];
}

interface ProjectListProps {
    projects: Project[];
    onProjectClick: (project: Project) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onProjectClick }) => {
    return (
        <main className="flex gap-4 max-w-md-1k mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card className="flex flex-col projectlist-classify">
                <p className=" mx-auto">分类</p>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
                <div className="lg:col-span-3">
                    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="projectlist-nav">
                                <tr>
                                    <th className="">项目</th>
                                    <th className="">最新版本</th>
                                    <th className="">最新更新时间</th>
                                    <th className="">操作</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {projects.map((project) => (
                                    <tr
                                        key={project.id}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <span className="text-2xl mr-3">
                                                    {project.icon}
                                                </span>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {project.name}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge variant="blue">{project.latest_version}</Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {project.latest_update_time}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => onProjectClick(project)}
                                                className="text-sky-600 hover:text-sky-900 transition-colors"
                                            >
                                                查看详情
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {projects.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-500">暂无项目数据</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default ProjectList;
