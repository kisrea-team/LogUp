'use client';

import { useState, useEffect } from 'react';
// import ReactMarkdown from 'react-markdown';
import { apiFetch, getApiBaseUrl } from '@/lib/api';
import Loading from '@/components/Loading';
import ProjectLog from '@/components/ProjectLog';
import ProjectList from '@/components/ProjectList';

//const API_BASE_URL = getApiBaseUrl(); // Use relative path for Next.js rewrites

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
    const [progress, setProgress] = useState(10);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // 从API获取项目数据
    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            setProgress(10); // 开始加载
            setErrorMessage(null);
            // 模拟网络延迟
            await new Promise(res => setTimeout(res, 200));
            setProgress(40); // 请求已发出
            const response = await apiFetch(`/projects`);
            setProgress(60); // 已收到响应
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setProgress(90); // 数据已解析
            setProjects(data);
        } catch (err) {
            console.error('获取项目数据失败:', err);
            setErrorMessage('无法连接到服务器，请确保后端服务正在运行');
            setProjects([]);
        } finally {
            setProgress(100);
            setTimeout(() => setLoading(false), 200); // 延迟关闭 loading，保证进度条动画
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
            <Loading progress={progress} />
        );
    }

    // 如果有错误消息但仍有数据，显示警告横幅
    const showErrorBanner = errorMessage && projects.length > 0;

    if (selectedProject) {
        return (
            <div className="min-h-screen bg-white">
                {/* Header */}
                <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={handleBackToList}
                                    className="text-blue-600 hover:text-blue-800 flex items-center space-x-2"
                                >
                                    <span>←</span>
                                    <span>返回项目列表</span>
                                </button>
                                <div className="h-6 w-px bg-gray-300"></div>
                                <div className="flex items-center space-x-3">
                                    <span className="text-2xl">{selectedProject.icon}</span>
                                    <h1 className="text-xl font-semibold text-gray-900">
                                        {selectedProject.name}
                                    </h1>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* 项目详情组件 */}
                <ProjectLog
                    selectedProject={selectedProject}
                    selectedVersion={selectedVersion}
                    setSelectedVersion={setSelectedVersion}
                />
            </div>
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

                {/* Main content */}
                <ProjectList projects={projects} onProjectClick={handleProjectClick} />
            </div>
        </>
    );
}
