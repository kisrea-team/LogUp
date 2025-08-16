/*
 * @Date: 2025-08-15
 * @LastEditors: vhko
 * @LastEditTime: 2025-08-16
 * @FilePath: /LogUp/components/Project.tsx
 * Helllllloo!
 */
import React from 'react';
import { Button } from '@/components/ui/button';
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

interface ProjectRowProps {
    project: Project;
    onClick: (project: Project) => void;
}

const ProjectRow: React.FC<ProjectRowProps> = ({ project, onClick }) => (
    <div className="hover:bg-gray-50 transition-colors bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
        <div className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
                <span className="text-2xl mr-3">{project.icon}</span>
                <div>
                    <div className="text-sm font-medium text-gray-900">{project.name}</div>
                </div>
            </div>
        </div>
        <div className="px-6 py-4 whitespace-nowrap">
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {project.latest_version}
            </span>
        </div>
        <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {project.latest_update_time}
        </div>
        <div className="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <Button
                variant="outline"
                onClick={() => onClick(project)}
                className="text-blue-600 hover:text-blue-900 transition-colors"
            >
                查看详情
            </Button>
        </div>
    </div>
);

export default ProjectRow;
