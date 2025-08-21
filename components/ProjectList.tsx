/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2025-08-20
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
                    {/* <table className="min-w-full divide-y divide-gray-200">
                        <thead className="projectlist-nav">
                            <tr>
                                <th>项目</th>
                                <th>最新版本</th>
                                <th>最新更新时间</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {projects.map((project) => (
                                <tr
                                    key={project.id}
                                    className="hover:bg-gray-50 transition-colors"
                                    onClick={() => onProjectClick(project)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <span className="text-2xl mr-3">{project.icon}</span>
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
                                                // onClick={() => onProjectClick(project)}
                                                className="text-sky-600 hover:text-sky-900 transition-colors"
                                            >
                                                查看详情
                                            </button>
                                        </td>
                                </tr>
                            ))}
                        </tbody>
                    </table> */}

                    {projects.map((project) => (
                        <Card 
                            key={project.id} 
                            className="flex py-4 px-2 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => onProjectClick(project)}
                        >
                            <div className=" text-3xl">{project.icon}</div>
                            <div className="flex-col">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium">{project.name}</p>
                                    <span className="text-gray-400">--</span>
                                    <p className="text-gray-600">{project.summar || '暂无简介'}</p>
                                    <Badge variant="blue" className="ml-auto">{project.latest_version}</Badge>
                                </div>
                                <div className="mt-2 space-y-1">
                                    <p className="text-sm text-gray-700">{project.describe || '暂无详细描述'}</p>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span>{project.latest_update_time}</span>
                                        <span>作者: {project.author || '未知'}</span>
                                        <Badge variant="secondary">{project.type || '未分类'}</Badge>
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
