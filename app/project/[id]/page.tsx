'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, getApiBaseUrl } from '@/lib/api';
import Loading from '@/components/Loading';
import ProjectLog from '@/components/ProjectLog';

const API_BASE_URL = getApiBaseUrl();

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

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    
    const [project, setProject] = useState<Project | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(10);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (projectId) {
            fetchProject();
        }
    }, [projectId]);

    const fetchProject = async () => {
        try {
            setLoading(true);
            setProgress(10);
            setErrorMessage(null);
            
            await new Promise((res) => setTimeout(res, 200));
            setProgress(40);
            
            const response = await apiFetch(`/projects/${projectId}`);
            setProgress(60);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            setProgress(90);
            setProject(data);
            setSelectedVersion(data.versions[0] || null);
        } catch (err) {
            console.error('获取项目数据失败:', err);
            setErrorMessage('无法获取项目数据，请检查项目ID是否正确');
        } finally {
            setProgress(100);
            setTimeout(() => setLoading(false), 2);
        }
    };

    const handleBackToList = () => {
        router.push('/');
    };

    if (loading) {
        return <Loading progress={progress} />;
    }

    if (errorMessage || !project) {
        return (
            <div className="min-h-screen bg-white">
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
                            </div>
                        </div>
                    </div>
                </header>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center">
                        <p className="text-red-600">{errorMessage || '项目不存在'}</p>
                    </div>
                </div>
            </div>
        );
    }

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
                                <span className="text-2xl">{project.icon}</span>
                                <h1 className="text-xl font-semibold text-gray-900">
                                    {project.name}
                                </h1>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* 项目详情组件 */}
            <ProjectLog
                selectedProject={project}
                selectedVersion={selectedVersion}
                setSelectedVersion={setSelectedVersion}
            />
        </div>
    );
}
