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
        <div className="min-h-screen bg-gray-50 p-8" data-oid="hkd9bwt">
            <div className="max-w-7xl mx-auto" data-oid="i700y8a">
                <div className="mb-8" data-oid="5x7vo48">
                    <div className="flex justify-between items-center" data-oid="cp8_:h1">
                        <h1 className="text-3xl font-bold text-gray-900" data-oid="vzi:c9v">
                            项目管理
                        </h1>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            data-oid="ygi_nsw"
                        >
                            {showAddForm ? '取消' : '添加项目'}
                        </button>
                    </div>
                </div>

                {/* 添加项目表单 */}
                {showAddForm && (
                    <div className="bg-white rounded-lg shadow p-6 mb-8" data-oid="qx8.7m8">
                        <h2 className="text-lg font-semibold mb-4" data-oid="tpw1if_">
                            添加新项目
                        </h2>
                        <form onSubmit={handleAddProject} className="space-y-4" data-oid="e5p.rfr">
                            <div className="grid grid-cols-2 gap-4" data-oid="i2cxn_6">
                                <div data-oid="lkaqigy">
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                        data-oid=".1574rx"
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
                                        data-oid="6utvbyi"
                                    />
                                </div>
                                <div data-oid="zicikn_">
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                        data-oid="hgz:l79"
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
                                        data-oid="7t85tug"
                                    />
                                </div>
                                <div data-oid="jvb0rii">
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                        data-oid="pkv19vk"
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
                                        data-oid=":c4lrb3"
                                    />
                                </div>
                                <div data-oid="f6l6crm">
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                        data-oid=".3rowbn"
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
                                        data-oid="y2gw33b"
                                    />
                                </div>
                            </div>
                            <div className="flex space-x-4" data-oid="r99ah8l">
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                    data-oid="2a7k4ne"
                                >
                                    添加项目
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                    data-oid="y2ngnyg"
                                >
                                    取消
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* 项目列表 */}
                <div className="bg-white rounded-lg shadow overflow-hidden" data-oid="om3_g8q">
                    <div className="px-6 py-4 border-b border-gray-200" data-oid=":mvj33b">
                        <h2 className="text-lg font-semibold text-gray-900" data-oid="19aa7px">
                            项目列表
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center" data-oid="0ggt_pz">
                            <div
                                className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
                                data-oid="xyd7.hz"
                            ></div>
                            <p className="text-gray-600" data-oid="6m545_r">
                                加载中...
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto" data-oid="sngmesc">
                            <table
                                className="min-w-full divide-y divide-gray-200"
                                data-oid="9iqb4ts"
                            >
                                <thead className="bg-gray-50" data-oid="xg_n28t">
                                    <tr data-oid="q1jtq7c">
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            data-oid="-8di4lc"
                                        >
                                            项目
                                        </th>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            data-oid="stcvuc8"
                                        >
                                            最新版本
                                        </th>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            data-oid="n07:j_m"
                                        >
                                            更新时间
                                        </th>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            data-oid="_g_032b"
                                        >
                                            版本数量
                                        </th>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            data-oid="6bj_108"
                                        >
                                            操作
                                        </th>
                                    </tr>
                                </thead>
                                <tbody
                                    className="bg-white divide-y divide-gray-200"
                                    data-oid="ervf9wl"
                                >
                                    {projects.map((project) => (
                                        <tr
                                            key={project.id}
                                            className="hover:bg-gray-50"
                                            data-oid="30ynmk3"
                                        >
                                            <td
                                                className="px-6 py-4 whitespace-nowrap"
                                                data-oid="8kd8o5t"
                                            >
                                                <div
                                                    className="flex items-center"
                                                    data-oid="o261m0_"
                                                >
                                                    <span
                                                        className="text-2xl mr-3"
                                                        data-oid="gm8gllj"
                                                    >
                                                        {project.icon}
                                                    </span>
                                                    <div
                                                        className="text-sm font-medium text-gray-900"
                                                        data-oid="vhv1zrr"
                                                    >
                                                        {project.name}
                                                    </div>
                                                </div>
                                            </td>
                                            <td
                                                className="px-6 py-4 whitespace-nowrap"
                                                data-oid="nd-pukd"
                                            >
                                                <span
                                                    className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                                                    data-oid="npmdz:w"
                                                >
                                                    {project.latest_version}
                                                </span>
                                            </td>
                                            <td
                                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                                data-oid="329r-r7"
                                            >
                                                {project.latest_update_time}
                                            </td>
                                            <td
                                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                                data-oid="7wbang6"
                                            >
                                                {project.versions.length} 个版本
                                            </td>
                                            <td
                                                className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2"
                                                data-oid="cl8l755"
                                            >
                                                <button
                                                    onClick={() =>
                                                        window.open(
                                                            `/?project=${project.id}`,
                                                            '_blank',
                                                        )
                                                    }
                                                    className="text-blue-600 hover:text-blue-900"
                                                    data-oid="p6ay_j0"
                                                >
                                                    查看
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProject(project.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    data-oid="le50ay8"
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
            </div>
        </div>
    );
}
