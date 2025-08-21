'use client';

import { useState, useEffect } from 'react';
import { apiFetch, getApiBaseUrl } from '@/lib/api';
import { projectTable } from '@/components/data/projectTable';
import AdminProjectList from '@/components/AdminProjectList';

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
    describe?: string;
    summar?: string;
    author?: string;
    type?: string;
    versions: Version[];
}

interface ProjectCreate {
    icon: string;
    name: string;
    latest_version: string;
    latest_update_time: string;
    describe?: string;
    summar?: string;
    author?: string;
    type?: string;
}

export default function ProjectAdminPage() {
    const table = projectTable.filter((item) => item.sort === 'a');
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(10);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [newProject, setNewProject] = useState<ProjectCreate>({
        icon: '',
        name: '',
        latest_version: '',
        latest_update_time: new Date().toISOString().split('T')[0],
        describe: '',
        summar: '',
        author: '',
        type: '',
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            setProgress(10);
            await new Promise((res) => setTimeout(res, 150));
            setProgress(40);
            const response = await apiFetch(`/projects`);
            setProgress(60);
            if (response.ok) {
                const data = await response.json();
                setProgress(90);
                setProjects(data);
            }
        } catch (error) {
            console.error('获取项目失败:', error);
        } finally {
            setProgress(100);
            setTimeout(() => setLoading(false), 200);
        }
    };

    const handleAddProject = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await apiFetch(`/projects`, {
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
                    describe: '',
                    summar: '',
                    author: '',
                    type: '',
                });
                setShowAddForm(false);
            }
        } catch (error) {
            console.error('添加项目失败:', error);
        }
    };

    const handleEditProject = (project: Project) => {
        setEditingProject(project);
        setShowAddForm(true);
    };

    const handleUpdateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProject) return;

        try {
            console.log('Updating project with ID:', editingProject.id);
            console.log('Project data:', editingProject);
            
            const response = await apiFetch(`/projects/${editingProject.id}/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                icon: editingProject.icon,
                name: editingProject.name,
                latest_version: editingProject.latest_version,
                latest_update_time: editingProject.latest_update_time,
                describe: editingProject.describe,
                summar: editingProject.summar,
                author: editingProject.author,
                type: editingProject.type,
              }),
            });

            console.log('Update response status:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('Update response data:', data);
                await fetchProjects();
                setEditingProject(null);
                setShowAddForm(false);
            } else {
                const errorData = await response.json();
                console.error('Update failed:', errorData);
            }
        } catch (error) {
            console.error('更新项目失败:', error);
        }
    };

    const handleDeleteProject = async (projectId: number) => {
        if (confirm('确定要删除这个项目吗？')) {
            try {
                const response = await apiFetch(`/projects/${projectId}`, {
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
                        <h1 className="text-3xl font-bold text-gray-900">项目管理</h1>
                        <button
                            onClick={() => {
                                if (showAddForm) {
                                    setShowAddForm(false);
                                    setEditingProject(null);
                                } else {
                                    setShowAddForm(true);
                                }
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            {showAddForm ? '取消' : '添加项目'}
                        </button>
                    </div>
                </div>

                {/* 添加/编辑项目表单 */}
                {showAddForm && (
                    <div className="bg-white rounded-lg shadow p-6 mb-8">
                        <h2 className="text-lg font-semibold mb-4">
                            {editingProject ? '编辑项目' : '添加新项目'}
                        </h2>
                        <form onSubmit={editingProject ? handleUpdateProject : handleAddProject} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        简介
                                    </label>
                                    <textarea
                                        value={editingProject ? editingProject.describe || '' : newProject.describe}
                                        onChange={(e) => {
                                            if (editingProject) {
                                                setEditingProject(prev => prev ? { ...prev, describe: e.target.value } : null);
                                            } else {
                                                setNewProject(prev => ({ ...prev, describe: e.target.value }));
                                            }
                                        }}
                                        placeholder="项目详细描述"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        一句话简述
                                    </label>
                                    <input
                                        type="text"
                                        value={editingProject ? editingProject.summar || '' : newProject.summar}
                                        onChange={(e) => {
                                            if (editingProject) {
                                                setEditingProject(prev => prev ? { ...prev, summar: e.target.value } : null);
                                            } else {
                                                setNewProject(prev => ({ ...prev, summar: e.target.value }));
                                            }
                                        }}
                                        placeholder="简短描述"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        作者
                                    </label>
                                    <input
                                        type="text"
                                        value={editingProject ? editingProject.author || '' : newProject.author}
                                        onChange={(e) => {
                                            if (editingProject) {
                                                setEditingProject(prev => prev ? { ...prev, author: e.target.value } : null);
                                            } else {
                                                setNewProject(prev => ({ ...prev, author: e.target.value }));
                                            }
                                        }}
                                        placeholder="项目作者"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        项目类型
                                    </label>
                                    <input
                                        type="text"
                                        value={editingProject ? editingProject.type || '' : newProject.type}
                                        onChange={(e) => {
                                            if (editingProject) {
                                                setEditingProject(prev => prev ? { ...prev, type: e.target.value } : null);
                                            } else {
                                                setNewProject(prev => ({ ...prev, type: e.target.value }));
                                            }
                                        }}
                                        placeholder="工具、框架、服务等"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        图标
                                    </label>
                                    <input
                                        type="text"
                                        value={editingProject ? editingProject.icon : newProject.icon}
                                        onChange={(e) => {
                                            if (editingProject) {
                                                setEditingProject(prev => prev ? { ...prev, icon: e.target.value } : null);
                                            } else {
                                                setNewProject(prev => ({ ...prev, icon: e.target.value }));
                                            }
                                        }}
                                        placeholder="🚀"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        项目名称
                                    </label>
                                    <input
                                        type="text"
                                        value={editingProject ? editingProject.name : newProject.name}
                                        onChange={(e) => {
                                            if (editingProject) {
                                                setEditingProject(prev => prev ? { ...prev, name: e.target.value } : null);
                                            } else {
                                                setNewProject(prev => ({ ...prev, name: e.target.value }));
                                            }
                                        }}
                                        placeholder="项目名称"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        最新版本
                                    </label>
                                    <input
                                        type="text"
                                        value={editingProject ? editingProject.latest_version : newProject.latest_version}
                                        onChange={(e) => {
                                            if (editingProject) {
                                                setEditingProject(prev => prev ? { ...prev, latest_version: e.target.value } : null);
                                            } else {
                                                setNewProject(prev => ({ ...prev, latest_version: e.target.value }));
                                            }
                                        }}
                                        placeholder="v1.0.0"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        更新时间
                                    </label>
                                    <input
                                        type="date"
                                        value={editingProject ? editingProject.latest_update_time : newProject.latest_update_time}
                                        onChange={(e) => {
                                            if (editingProject) {
                                                setEditingProject(prev => prev ? { ...prev, latest_update_time: e.target.value } : null);
                                            } else {
                                                setNewProject(prev => ({ ...prev, latest_update_time: e.target.value }));
                                            }
                                        }}
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
                                    {editingProject ? '更新项目' : '添加项目'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setEditingProject(null);
                                    }}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                >
                                    取消
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* 项目列表 */}
                <AdminProjectList
                    loading={loading}
                    progress={progress}
                    table={table}
                    projects={projects}
                    handleDeleteProject={handleDeleteProject}
                    handleEditProject={handleEditProject}
                />
            </div>
        </div>
    );
}
