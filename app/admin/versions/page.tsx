'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

export default function VersionAdminPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [versions, setVersions] = useState<Version[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingVersion, setEditingVersion] = useState<Version | null>(null);
    const [newVersion, setNewVersion] = useState<Omit<Version, 'id'>>({
        project_id: 0,
        version: '',
        update_time: new Date().toISOString().split('T')[0],
        content: '',
        download_url: '',
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (selectedProject) {
            setVersions(selectedProject.versions);
        } else {
            setVersions([]);
        }
    }, [selectedProject]);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const response = await apiFetch(`${API_BASE_URL}/projects`);
            if (response.ok) {
                const data = await response.json();
                setProjects(data);
                if (data.length > 0 && !selectedProject) {
                    setSelectedProject(data[0]);
                }
            }
        } catch (error) {
            console.error('获取项目失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddVersion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) return;

        try {
            const versionData = {
                ...newVersion,
                project_id: selectedProject.id,
            };

            const response = await apiFetch(`${API_BASE_URL}/versions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(versionData),
            });

            if (response.ok) {
                await fetchProjects(); // Refresh projects and versions
                setNewVersion({
                    project_id: selectedProject.id,
                    version: '',
                    update_time: new Date().toISOString().split('T')[0],
                    content: '',
                    download_url: '',
                });
                setShowAddForm(false);
            }
        } catch (error) {
            console.error('添加版本失败:', error);
        }
    };

    const handleUpdateVersion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVersion || !selectedProject) return;

        try {
            // Create VersionCreate object without id
            const versionData = {
                project_id: editingVersion.project_id,
                version: editingVersion.version,
                update_time: editingVersion.update_time,
                content: editingVersion.content,
                download_url: editingVersion.download_url,
            };

            const response = await apiFetch(`${API_BASE_URL}/versions/${editingVersion.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(versionData),
            });

            if (response.ok) {
                await fetchProjects(); // Refresh projects and versions
                setEditingVersion(null);
            }
        } catch (error) {
            console.error('更新版本失败:', error);
        }
    };

    const handleDeleteVersion = async (versionId: number) => {
        if (confirm('确定要删除这个版本吗？')) {
            try {
                const response = await apiFetch(`${API_BASE_URL}/versions/${versionId}`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    await fetchProjects(); // Refresh projects and versions
                }
            } catch (error) {
                console.error('删除版本失败:', error);
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">加载中...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-gray-900">版本管理</h1>
                        {selectedProject && (
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                {showAddForm ? '取消' : '添加版本'}
                            </button>
                        )}
                    </div>
                </div>

                {/* 项目选择器 */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-lg font-semibold mb-4">选择项目</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                onClick={() => setSelectedProject(project)}
                                className={`p-4 border rounded-md cursor-pointer ${
                                    selectedProject?.id === project.id
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center">
                                    <span className="text-2xl mr-3">{project.icon}</span>
                                    <div>
                                        <h3 className="font-medium text-gray-900">{project.name}</h3>
                                        <p className="text-sm text-gray-500">
                                            {project.versions.length} 个版本
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {selectedProject && (
                    <>
                        {/* 添加版本表单 */}
                        {showAddForm && (
                            <div className="bg-white rounded-lg shadow p-6 mb-8">
                                <h2 className="text-lg font-semibold mb-4">添加新版本</h2>
                                <form onSubmit={handleAddVersion} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                项目
                                            </label>
                                            <input
                                                type="text"
                                                value={selectedProject.name}
                                                disabled
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                版本号
                                            </label>
                                            <input
                                                type="text"
                                                value={newVersion.version}
                                                onChange={(e) =>
                                                    setNewVersion((prev) => ({
                                                        ...prev,
                                                        version: e.target.value,
                                                    }))
                                                }
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
                                                value={newVersion.update_time}
                                                onChange={(e) =>
                                                    setNewVersion((prev) => ({
                                                        ...prev,
                                                        update_time: e.target.value,
                                                    }))
                                                }
                                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                下载链接
                                            </label>
                                            <input
                                                type="url"
                                                value={newVersion.download_url}
                                                onChange={(e) =>
                                                    setNewVersion((prev) => ({
                                                        ...prev,
                                                        download_url: e.target.value,
                                                    }))
                                                }
                                                placeholder="https://example.com/download"
                                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            更新内容
                                        </label>
                                        <textarea
                                            value={newVersion.content}
                                            onChange={(e) =>
                                                setNewVersion((prev) => ({
                                                    ...prev,
                                                    content: e.target.value,
                                                }))
                                            }
                                            placeholder="版本更新内容..."
                                            rows={6}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                                            required
                                        />
                                    </div>
                                    <div className="flex space-x-4">
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                        >
                                            添加版本
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

                        {/* 编辑版本表单 */}
                        {editingVersion && (
                            <div className="bg-white rounded-lg shadow p-6 mb-8">
                                <h2 className="text-lg font-semibold mb-4">编辑版本</h2>
                                <form onSubmit={handleUpdateVersion} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                项目
                                            </label>
                                            <input
                                                type="text"
                                                value={selectedProject.name}
                                                disabled
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                版本号
                                            </label>
                                            <input
                                                type="text"
                                                value={editingVersion.version}
                                                onChange={(e) =>
                                                    setEditingVersion((prev) =>
                                                        prev ? { ...prev, version: e.target.value } : null
                                                    )}
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
                                                value={editingVersion.update_time}
                                                onChange={(e) =>
                                                    setEditingVersion((prev) =>
                                                        prev ? { ...prev, update_time: e.target.value } : null
                                                    )}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                下载链接
                                            </label>
                                            <input
                                                type="url"
                                                value={editingVersion.download_url}
                                                onChange={(e) =>
                                                    setEditingVersion((prev) =>
                                                        prev ? { ...prev, download_url: e.target.value } : null
                                                    )}
                                                placeholder="https://example.com/download"
                                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            更新内容
                                        </label>
                                        <textarea
                                            value={editingVersion.content}
                                            onChange={(e) =>
                                                setEditingVersion((prev) =>
                                                    prev ? { ...prev, content: e.target.value } : null
                                                )}
                                            placeholder="版本更新内容..."
                                            rows={6}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                                            required
                                        />
                                    </div>
                                    <div className="flex space-x-4">
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                        >
                                            更新版本
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingVersion(null)}
                                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                        >
                                            取消
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* 版本列表 */}
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {selectedProject.name} - 版本列表
                                </h2>
                            </div>

                            {versions.length === 0 ? (
                                <div className="p-8 text-center">
                                    <p className="text-gray-600">该项目还没有版本信息</p>
                                    <button
                                        onClick={() => setShowAddForm(true)}
                                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        添加第一个版本
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    版本
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    更新时间
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    内容预览
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    操作
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {versions.map((version) => (
                                                <tr key={version.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                                            {version.version}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {version.update_time}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-md">
                                                        <div className="truncate max-w-xs">
                                                            {version.content.substring(0, 100)}
                                                            {version.content.length > 100 ? '...' : ''}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                        <button
                                                            onClick={() => setEditingVersion(version)}
                                                            className="text-blue-600 hover:text-blue-900"
                                                        >
                                                            编辑
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteVersion(version.id!)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            删除
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {!selectedProject && projects.length === 0 && (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-600 mb-4">暂无项目数据</p>
                        <Link
                            href="/admin/projects"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            去创建项目
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}