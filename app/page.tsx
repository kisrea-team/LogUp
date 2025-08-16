'use client';

import { useState, useEffect } from 'react';
import LazyAd from '@/components/LazyAd';
import { adConfigs } from '@/lib/adConfigs';
import Project from '@/components/Project';
import ProjectDetail from '@/components/ProjectDetail';

const API_BASE_URL = 'http://localhost:8000';

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

export default function Page() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // 从API获取项目数据
    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            setErrorMessage(null);
            const response = await fetch(`${API_BASE_URL}/projects`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setProjects(data);
        } catch (err) {
            console.error('获取项目数据失败:', err);
            setErrorMessage('无法连接到服务器，请确保后端服务正在运行 (http://localhost:8000)');
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    const handleProjectClick = (project: Project) => {
        setSelectedProject(project);
        setSelectedVersion(project.versions[0] || null); // Select latest version by default
    };

    const handleBackToList = () => {
        setSelectedProject(null);
        setSelectedVersion(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">加载中...？</p>
                </div>
            </div>
        );
    }

    // 如果有错误消息但仍有数据，显示警告横幅
    const showErrorBanner = errorMessage && projects.length > 0;

    if (selectedProject) {
        return (
            <ProjectDetail
                project={selectedProject}
                version={selectedVersion}
                setVersion={setSelectedVersion}
                onBack={handleBackToList}
            />
        );
    }

    return (
        <>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow-sm border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="py-6">
                            <h1 className="text-3xl font-bold text-gray-900">项目更新日志聚合</h1>
                            <p className="mt-2 text-gray-600">查看所有项目的最新更新和版本历史</p>
                        </div>
                    </div>
                </header>

                {/* Error Banner */}
                {showErrorBanner && (
                    <div className="bg-yellow-50 border-b border-yellow-200">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                            <div className="flex items-center">
                                <div className="text-yellow-600 mr-3">⚠️</div>
                                <div className="flex-1">
                                    <p className="text-sm text-yellow-800">
                                        无法连接到后端服务，正在显示示例数据
                                    </p>
                                </div>
                                <button
                                    onClick={fetchProjects}
                                    className="text-sm text-yellow-800 hover:text-yellow-900 underline"
                                >
                                    重试连接
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div>
                        {/* Main Content */}
                        <div className="lg:col-span-2">
                            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                                <div className="min-w-full divide-y divide-gray-200">
                                    <div className="bg-gray-50">
                                        <div>
                                            <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                项目
                                            </div>
                                            <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                最新版本
                                            </div>
                                            <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                最新更新时间
                                            </div>
                                            <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                操作
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white divide-y divide-gray-200">
                                        {projects.map((project) => (
                                            <Project
                                                key={project.id}
                                                project={project}
                                                onClick={handleProjectClick}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {projects.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-gray-500">暂无项目数据</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
