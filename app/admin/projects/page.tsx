'use client';

import { useState, useEffect } from 'react';
import { apiFetch, getApiBaseUrl } from '@/lib/api';

const API_BASE_URL = getApiBaseUrl();

interface Version {
    id?: number;
    project_id?: number;
    version: string;
    update_time: string;
    content: string;
    download_url: string;
}

interface Project {
    id: number;
    icon: string;
    name: string;
    latest_version: string;
    latest_update_time: string;
    versions: Version[];
}

interface ProjectCreate {
    icon: string;
    name: string;
    latest_version: string;
    latest_update_time: string;
}

export default function ProjectAdminPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newProject, setNewProject] = useState<ProjectCreate>({
        icon: '',
        name: '',
        latest_version: '',
        latest_update_time: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const response = await apiFetch(`/projects`);
            if (response.ok) {
                const data = await response.json();
                setProjects(data);
            }
        } catch (error) {
            console.error('获取项目失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddProject = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await apiFetch(`${API_BASE_URL}/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newProject),
            });

            if (response.ok) {
                await fetchProjects();
                setNewProject({
                    icon: '',
                    name: '',
                    latest_version: '',
                    latest_update_time: new Date().toISOString().split('T')[0],
                });
                setShowAddForm(false);
            }
        } catch (error) {
            console.error('添加项目失败:', error);
        }
    };

    const handleDeleteProject = async (projectId: number) => {
        if (confirm('确定要删除这个项目吗？')) {
            try {
                const response = await apiFetch(`${API_BASE_URL}/projects/${projectId}`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    await fetchProjects();
                }
            } catch (error) {
                console.error('删除项目失败:', error);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-gray-900">
                            项目管理
                        </h1>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"

                        >
                            {showAddForm ? '取消' : '添加项目'}
                        </button>
                    </div>
                </div>

                {/* 添加项目表单 */}
                {showAddForm && (
                    <div className="bg-white rounded-lg shadow p-6 mb-8">
                        <h2 className="text-lg font-semibold mb-4">
                            添加新项目
                        </h2>
                        <form onSubmit={handleAddProject} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-1"

                                    >
                                        图标
                                    </label>
                                    <input
                                        type="text"
                                        value={newProject.icon}
                                        onChange={(e) =>
                                            setNewProject((prev) => ({
                                                ...prev,
                                                icon: e.target.value,
                                            }))
                                        }
                                        placeholder="🚀"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        required

                                    />
                                </div>
                                <div>
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-1"

                                    >
                                        项目名称
                                    </label>
                                    <input
                                        type="text"
                                        value={newProject.name}
                                        onChange={(e) =>
                                            setNewProject((prev) => ({
                                                ...prev,
                                                name: e.target.value,
                                            }))
                                        }
                                        placeholder="项目名称"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        required

                                    />
                                </div>
                                <div>
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-1"

                                    >
                                        最新版本
                                    </label>
                                    <input
                                        type="text"
                                        value={newProject.latest_version}
                                        onChange={(e) =>
                                            setNewProject((prev) => ({
                                                ...prev,
                                                latest_version: e.target.value,
                                            }))
                                        }
                                        placeholder="v1.0.0"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        required

                                    />
                                </div>
                                <div>
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-1"

                                    >
                                        更新时间
                                    </label>
                                    <input
                                        type="date"
                                        value={newProject.latest_update_time}
                                        onChange={(e) =>
                                            setNewProject((prev) => ({
                                                ...prev,
                                                latest_update_time: e.target.value,
                                            }))
                                        }
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        required

                                    />
                                </div>
                            </div>
                            <div className="flex space-x-4">
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"

                                >
                                    添加项目
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"

                                >
                                    取消
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* 项目列表 */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            项目列表
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center">
                            <div
                                className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"

                            ></div>
                            <p className="text-gray-600">
                                加载中...
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <div
                                className="min-w-full divide-y divide-gray-200"

                            >
                                <div className="bg-gray-50">
                                    <div>
                                        <p
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"

                                        >
                                            项目
                                        </p>
                                        <p
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"

                                        >
                                            最新版本
                                        </p>
                                        <p
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"

                                        >
                                            更新时间
                                        </p>
                                        <p
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"

                                        >
                                            版本数量
                                        </p>
                                        <p
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"

                                        >
                                            操作
                                        </p>
                                    </div>
                                </div>
                                <tbody
                                    className="bg-white divide-y divide-gray-200"

                                >
                                    {projects.map((project) => (
                                        <div
                                            key={project.id}
                                            className="hover:bg-gray-50"

                                        >
                                            <p
                                                className="px-6 py-4 whitespace-nowrap"

                                            >
                                                <div
                                                    className="flex items-center"

                                                >
                                                    <span
                                                        className="text-2xl mr-3"

                                                    >
                                                        {project.icon}
                                                    </span>
                                                    <div
                                                        className="text-sm font-medium text-gray-900"

                                                    >
                                                        {project.name}
                                                    </div>
                                                </div>
                                            </p>
                                            <p
                                                className="px-6 py-4 whitespace-nowrap"

                                            >
                                                <span
                                                    className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"

                                                >
                                                    {project.latest_version}
                                                </span>
                                            </p>
                                            <p
                                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"

                                            >
                                                {project.latest_update_time}
                                            </p>
                                            <p
                                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"

                                            >
                                                {project.versions.length} 个版本
                                            </p>
                                            <p
                                                className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2"

                                            >
                                                <button
                                                    onClick={() =>
                                                        window.open(
                                                            `/?project=${project.id}`,
                                                            '_blank',
                                                        )
                                                    }
                                                    className="text-blue-600 hover:text-blue-900"

                                                >
                                                    查看
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProject(project.id)}
                                                    className="text-red-600 hover:text-red-900"

                                                >
                                                    删除
                                                </button>
                                            </p>
                                        </div>
                                    ))}
                                </tbody>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
