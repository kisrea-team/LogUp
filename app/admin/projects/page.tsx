'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { projectTable } from '@/components/utils/projectTable';
import AdminProjectList from '@/components/AdminProjectList';
import Pagination from '@/components/Pagination';

import { Project, Version, ProjectLink } from '@/types/index';
// interface Version {
//     id?: number;
//     project_id?: number;
//     version: string;
//     update_time: string;
//     content: string;
//     download_url: string;
// }

// interface Project {
//     id: number;
//     icon: string;
//     name: string;
//     latest_version: string;
//     latest_update_time: string;
//     describe?: string;
//     summar?: string;
//     author?: string;
//     type?: string;
//     versions: Version[];
// }

export default function ProjectAdminPage() {
    const table = projectTable.filter((item) => item.sort === 'a');
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProjects, setTotalProjects] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(10);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [githubLoading, setGithubLoading] = useState(false);
    const [fixIconsLoading, setFixIconsLoading] = useState(false);
    const [fixIconsResult, setFixIconsResult] = useState<{ total: number; fixed: number; failed: number } | null>(null);
    const [tagInput, setTagInput] = useState('');
    const [linkInput, setLinkInput] = useState<{ title: string; url: string; type: ProjectLink['type'] }>({
        title: '',
        url: '',
        type: 'tutorial',
    });
    const [newProject, setNewProject] = useState({
        icon: '',
        name: '',
        latest_version: '',
        latest_update_time: new Date().toISOString().split('T')[0],
        describe: '',
        summar: '',
        author: '',
        type: '',
        tags: [] as string[],
        links: [] as ProjectLink[],
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleFixIcons = async () => {
        try {
            setFixIconsLoading(true);
            setFixIconsResult(null);
            const response = await apiFetch(`/scrape/github/fix-icons`, { method: 'POST' });
            const data = await response.json().catch(() => null);
            if (data?.success) {
                setFixIconsResult({ total: data.total, fixed: data.fixed, failed: data.failed });
                await fetchProjects(currentPage);
            }
        } catch (error) {
            console.error('修复图标失败:', error);
        } finally {
            setFixIconsLoading(false);
        }
    };

    const addTag = (tag: string, target: 'new' | 'edit') => {
        const trimmed = tag.trim();
        if (!trimmed) return;
        if (target === 'edit') {
            setEditingProject((prev) =>
                prev && !(prev.tags || []).includes(trimmed)
                    ? { ...prev, tags: [...(prev.tags || []), trimmed] }
                    : prev
            );
        } else {
            setNewProject((prev) =>
                !prev.tags.includes(trimmed)
                    ? { ...prev, tags: [...prev.tags, trimmed] }
                    : prev
            );
        }
        setTagInput('');
    };

    const removeTag = (tag: string, target: 'new' | 'edit') => {
        if (target === 'edit') {
            setEditingProject((prev) =>
                prev ? { ...prev, tags: (prev.tags || []).filter((t) => t !== tag) } : prev
            );
        } else {
            setNewProject((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
        }
    };

    const addLink = (link: ProjectLink, target: 'new' | 'edit') => {
        if (!link.title.trim() || !link.url.trim()) return;
        if (target === 'edit') {
            setEditingProject((prev) =>
                prev ? { ...prev, links: [...(prev.links || []), link] } : prev
            );
        } else {
            setNewProject((prev) => ({ ...prev, links: [...prev.links, link] }));
        }
        setLinkInput({ title: '', url: '', type: 'tutorial' });
    };

    const removeLink = (index: number, target: 'new' | 'edit') => {
        if (target === 'edit') {
            setEditingProject((prev) =>
                prev ? { ...prev, links: (prev.links || []).filter((_, i) => i !== index) } : prev
            );
        } else {
            setNewProject((prev) => ({ ...prev, links: prev.links.filter((_, i) => i !== index) }));
        }
    };

    const fetchGithubRepoInfo = async () => {
        const repoUrl = (editingProject ? editingProject.name : newProject.name).trim();
        if (!repoUrl) return;

        try {
            setGithubLoading(true);
            const response = await apiFetch(`/scrape/github/repo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success || !payload?.data) return;

            const info = payload.data as {
                icon?: string;
                name?: string;
                latest_version?: string;
                latest_update_time?: string;
                describe?: string;
                summar?: string;
                author?: string;
                type?: string;
            };

            if (editingProject) {
                setEditingProject((prev) =>
                    prev
                        ? {
                            ...prev,
                            icon: info.icon ?? prev.icon,
                            name: info.name ?? prev.name,
                            latest_version: info.latest_version ?? prev.latest_version,
                            latest_update_time:
                                info.latest_update_time ?? prev.latest_update_time,
                            describe: info.describe ?? prev.describe,
                            summar: info.summar ?? prev.summar,
                            author: info.author ?? prev.author,
                            type: info.type ?? prev.type,
                        }
                        : null,
                );
            } else {
                setNewProject((prev) => ({
                    ...prev,
                    icon: info.icon ?? prev.icon,
                    name: info.name ?? prev.name,
                    latest_version: info.latest_version ?? prev.latest_version,
                    latest_update_time: info.latest_update_time ?? prev.latest_update_time,
                    describe: info.describe ?? prev.describe,
                    summar: info.summar ?? prev.summar,
                    author: info.author ?? prev.author,
                    type: info.type ?? prev.type,
                }));
            }
        } finally {
            setGithubLoading(false);
        }
    };

    const fetchProjects = async (page: number = currentPage) => {
        // Validate page number
        if (page < 1) page = 1;
        if (page > totalPages && totalPages > 0) page = totalPages;

        try {
            setLoading(true);
            setProgress(10);
            await new Promise((res) => setTimeout(res, 150));
            setProgress(40);
            const response = await apiFetch(`/projects?page=${page}&per_page=${perPage}`);
            setProgress(60);
            if (response.ok) {
                const data = await response.json();
                setProgress(90);
                console.log('Admin API Response:', data); // 添加调试日志

                // 处理不同的数据结构
                const projectsData = Array.isArray(data) ? data : data.data || data.projects || [];
                let totalPagesData = data.total_pages || data.totalPages;
                let totalItemsData = data.total || data.totalItems;
                let currentPageData = data.page || data.currentPage || page;

                // 前端兜底分页：当后端未返回分页信息时
                if (!totalPagesData || !totalItemsData) {
                    const total = projectsData.length;
                    const pages = Math.max(1, Math.ceil(total / perPage));
                    totalItemsData = total;
                    totalPagesData = pages;
                    currentPageData = Math.min(Math.max(1, currentPageData), pages);
                    const start = (currentPageData - 1) * perPage;
                    const end = start + perPage;
                    setProjects(projectsData.slice(start, end));
                } else {
                    setProjects(projectsData);
                }

                setTotalPages(totalPagesData);
                setTotalProjects(totalItemsData);
                setCurrentPage(currentPageData);
            }
        } catch (error) {
            console.error('获取项目失败:', error);
        } finally {
            setProgress(100);
            setTimeout(() => setLoading(false), 100);
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
                await fetchProjects(currentPage);
                setNewProject({
                    icon: '',
                    name: '',
                    latest_version: '',
                    latest_update_time: new Date().toISOString().split('T')[0],
                    describe: '',
                    summar: '',
                    author: '',
                    type: '',
                    tags: [],
                    links: [],
                });
                setShowAddForm(false);
            }
        } catch (error) {
            console.error('添加项目失败:', error);
        }
    };

    const handleEditProject = (project: Project) => {
        setEditingProject(project);
        setTagInput('');
        setLinkInput({ title: '', url: '', type: 'tutorial' });
        setShowAddForm(true);
    };

    const handleUpdateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProject) return;

        try {
            console.log('Updating project with ID:', editingProject.id);
            console.log('Project data:', editingProject);

            const response = await apiFetch(`/projects/${editingProject.id}`, {
                method: 'PUT',
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
                    tags: editingProject.tags || [],
                    links: editingProject.links || [],
                }),
            });

            console.log('Update response status:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('Update response data:', data);
                await fetchProjects(currentPage);
                setEditingProject(null);
                setTagInput('');
                setLinkInput({ title: '', url: '', type: 'tutorial' });
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
                    await fetchProjects(currentPage);
                }
            } catch (error) {
                console.error('删除项目失败:', error);
            }
        }
    };

    return (
        <div>
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-gray-900">项目管理</h1>
                        <div className="flex items-center gap-3">
                            {fixIconsResult && (
                                <span className="text-sm text-gray-500">
                                    修复完成：{fixIconsResult.fixed}/{fixIconsResult.total} 成功，{fixIconsResult.failed} 失败
                                </span>
                            )}
                            <button
                                onClick={handleFixIcons}
                                disabled={fixIconsLoading}
                                className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-60"
                            >
                                {fixIconsLoading ? '修复中...' : '修复图标'}
                            </button>
                            <button
                                onClick={() => {
                                    if (showAddForm) {
                                        setShowAddForm(false);
                                        setEditingProject(null);
                                        setTagInput('');
                                        setLinkInput({ title: '', url: '', type: 'tutorial' });
                                    } else {
                                        setShowAddForm(true);
                                    }
                                }}
                                className="px-4 py-2 bg-blue-300 text-white rounded-md hover:bg-blue-400"
                            >
                                {showAddForm ? '取消' : '添加项目'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 添加/编辑项目表单 */}
                {showAddForm && (
                    <div className="rounded-lg shadow p-6 mb-8">
                        <h2 className="text-lg font-semibold mb-4">
                            {editingProject ? '编辑项目' : '添加新项目'}
                        </h2>
                        <form
                            onSubmit={editingProject ? handleUpdateProject : handleAddProject}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        简介
                                    </label>
                                    <textarea
                                        value={
                                            editingProject
                                                ? editingProject.describe || ''
                                                : newProject.describe
                                        }
                                        onChange={(e) => {
                                            if (editingProject) {
                                                setEditingProject((prev) =>
                                                    prev
                                                        ? { ...prev, describe: e.target.value }
                                                        : null,
                                                );
                                            } else {
                                                setNewProject((prev) => ({
                                                    ...prev,
                                                    describe: e.target.value,
                                                }));
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
                                        value={
                                            editingProject
                                                ? editingProject.summar || ''
                                                : newProject.summar
                                        }
                                        onChange={(e) => {
                                            if (editingProject) {
                                                setEditingProject((prev) =>
                                                    prev
                                                        ? { ...prev, summar: e.target.value }
                                                        : null,
                                                );
                                            } else {
                                                setNewProject((prev) => ({
                                                    ...prev,
                                                    summar: e.target.value,
                                                }));
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
                                        value={
                                            editingProject
                                                ? editingProject.author || ''
                                                : newProject.author
                                        }
                                        onChange={(e) => {
                                            if (editingProject) {
                                                setEditingProject((prev) =>
                                                    prev
                                                        ? { ...prev, author: e.target.value }
                                                        : null,
                                                );
                                            } else {
                                                setNewProject((prev) => ({
                                                    ...prev,
                                                    author: e.target.value,
                                                }));
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
                                        value={
                                            editingProject
                                                ? editingProject.type || ''
                                                : newProject.type
                                        }
                                        onChange={(e) => {
                                            if (editingProject) {
                                                setEditingProject((prev) =>
                                                    prev ? { ...prev, type: e.target.value } : null,
                                                );
                                            } else {
                                                setNewProject((prev) => ({
                                                    ...prev,
                                                    type: e.target.value,
                                                }));
                                            }
                                        }}
                                        placeholder="工具、框架、服务等"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                            </div>
                            {/* Tags 输入 - 独占一行 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    标签
                                </label>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {(editingProject ? (editingProject.tags || []) : newProject.tags).map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800"
                                        >
                                            #{tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag, editingProject ? 'edit' : 'new')}
                                                className="hover:text-red-600 font-bold leading-none"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ',') {
                                                e.preventDefault();
                                                addTag(tagInput, editingProject ? 'edit' : 'new');
                                            }
                                        }}
                                        placeholder="输入标签后按 Enter 或逗号添加"
                                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => addTag(tagInput, editingProject ? 'edit' : 'new')}
                                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                                    >
                                        添加
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        图标
                                    </label>
                                    <input
                                        type="text"
                                        value={
                                            editingProject ? editingProject.icon : newProject.icon
                                        }
                                        onChange={(e) => {
                                            if (editingProject) {
                                                setEditingProject((prev) =>
                                                    prev ? { ...prev, icon: e.target.value } : null,
                                                );
                                            } else {
                                                setNewProject((prev) => ({
                                                    ...prev,
                                                    icon: e.target.value,
                                                }));
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
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={
                                                editingProject
                                                    ? editingProject.name
                                                    : newProject.name
                                            }
                                            onChange={(e) => {
                                                if (editingProject) {
                                                    setEditingProject((prev) =>
                                                        prev
                                                            ? { ...prev, name: e.target.value }
                                                            : null,
                                                    );
                                                } else {
                                                    setNewProject((prev) => ({
                                                        ...prev,
                                                        name: e.target.value,
                                                    }));
                                                }
                                            }}
                                            placeholder="GitHub 仓库地址或 owner/repo"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={fetchGithubRepoInfo}
                                            disabled={githubLoading}
                                            className="px-3 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-60 whitespace-nowrap"
                                        >
                                            {githubLoading ? '爬取中...' : '爬取 GitHub 信息'}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        最新版本
                                    </label>
                                    <input
                                        type="text"
                                        value={
                                            editingProject
                                                ? editingProject.latest_version
                                                : newProject.latest_version
                                        }
                                        onChange={(e) => {
                                            if (editingProject) {
                                                setEditingProject((prev) =>
                                                    prev
                                                        ? {
                                                            ...prev,
                                                            latest_version: e.target.value,
                                                        }
                                                        : null,
                                                );
                                            } else {
                                                setNewProject((prev) => ({
                                                    ...prev,
                                                    latest_version: e.target.value,
                                                }));
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
                                        value={
                                            editingProject
                                                ? editingProject.latest_update_time
                                                : newProject.latest_update_time
                                        }
                                        onChange={(e) => {
                                            if (editingProject) {
                                                setEditingProject((prev) =>
                                                    prev
                                                        ? {
                                                            ...prev,
                                                            latest_update_time: e.target.value,
                                                        }
                                                        : null,
                                                );
                                            } else {
                                                setNewProject((prev) => ({
                                                    ...prev,
                                                    latest_update_time: e.target.value,
                                                }));
                                            }
                                        }}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                    />
                                </div>
                            </div>
                            {/* 相关链接 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    相关资源链接
                                </label>
                                <div className="space-y-1.5 mb-2">
                                    {(editingProject ? (editingProject.links || []) : newProject.links).map((link, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                            <span className="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-500 shrink-0">
                                                {{tutorial:'教程',review:'测评',docs:'文档',video:'视频',blog:'博客',community:'社区'}[link.type]}
                                            </span>
                                            <span className="flex-1 truncate text-gray-700">{link.title}</span>
                                            <span className="text-xs text-gray-400 truncate max-w-[160px]">{link.url}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeLink(i, editingProject ? 'edit' : 'new')}
                                                className="text-red-400 hover:text-red-600 font-bold leading-none shrink-0"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={linkInput.title}
                                        onChange={(e) => setLinkInput((prev) => ({ ...prev, title: e.target.value }))}
                                        placeholder="链接标题"
                                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    />
                                    <input
                                        type="url"
                                        value={linkInput.url}
                                        onChange={(e) => setLinkInput((prev) => ({ ...prev, url: e.target.value }))}
                                        placeholder="https://..."
                                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    />
                                    <select
                                        value={linkInput.type}
                                        onChange={(e) => setLinkInput((prev) => ({ ...prev, type: e.target.value as ProjectLink['type'] }))}
                                        className="border border-gray-300 rounded-md px-2 py-2 text-sm"
                                    >
                                        <option value="tutorial">教程</option>
                                        <option value="review">测评</option>
                                        <option value="docs">文档</option>
                                        <option value="video">视频</option>
                                        <option value="blog">博客</option>
                                        <option value="community">社区</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => addLink(linkInput, editingProject ? 'edit' : 'new')}
                                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm shrink-0"
                                    >
                                        添加
                                    </button>
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
                                        setTagInput('');
                                        setLinkInput({ title: '', url: '', type: 'tutorial' });
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

                {/* Pagination Controls */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalProjects}
                    itemsPerPage={perPage}
                    onPageChange={fetchProjects}
                />
            </div>
        </div>
    );
}
