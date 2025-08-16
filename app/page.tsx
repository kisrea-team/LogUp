'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

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

    // if (loading) {
    //     return (
    //         <div
    //             className="min-h-screen bg-gray-50 flex items-center justify-center"
    //             data-oid="p6psdev"
    //         >
    //             <div className="text-center" data-oid=":0mx4-a">
    //                 <div
    //                     className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
    //                     data-oid="m05l1o2"
    //                 ></div>
    //                 <p className="text-gray-600" data-oid="hsh68yo">
    //                     加载中...
    //                 </p>
    //             </div>
    //         </div>
    //     );
    // }

    // 如果有错误消息但仍有数据，显示警告横幅
    const showErrorBanner = errorMessage && projects.length > 0;

    if (selectedProject) {
        return (
            <div className="min-h-screen bg-white" data-oid="8a:t_4i">
                {/* Header */}
                <header
                    className="border-b border-gray-200 bg-white sticky top-0 z-10"
                    data-oid="navu5dg"
                >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" data-oid="gssjdui">
                        <div className="flex items-center justify-between h-16" data-oid="oo069ho">
                            <div className="flex items-center space-x-4" data-oid="4km6hw7">
                                <button
                                    onClick={handleBackToList}
                                    className="text-blue-600 hover:text-blue-800 flex items-center space-x-2"
                                    data-oid="k6no1f:"
                                >
                                    <span data-oid="zibkngf">←</span>
                                    <span data-oid="8dpgfpf">返回项目列表</span>
                                </button>
                                <div className="h-6 w-px bg-gray-300" data-oid="vgi6onx"></div>
                                <div className="flex items-center space-x-3" data-oid="1rc6l5k">
                                    <span className="text-2xl" data-oid="nismieg">
                                        {selectedProject.icon}
                                    </span>
                                    <h1
                                        className="text-xl font-semibold text-gray-900"
                                        data-oid="f7xpfnv"
                                    >
                                        {selectedProject.name}
                                    </h1>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="max-w-7xl mx-auto flex" data-oid="7uzne1a">
                    {/* Sidebar */}
                    <aside
                        className="w-64 bg-gray-50 min-h-screen border-r border-gray-200"
                        data-oid="a0:k_x:"
                    >
                        <div className="p-4" data-oid="50i23uh">
                            <h2
                                className="text-sm font-medium text-gray-900 mb-4"
                                data-oid="q7xdbe6"
                            >
                                版本历史
                            </h2>
                            <nav className="space-y-1" data-oid="qcn3mpc">
                                {selectedProject.versions.map((version) => (
                                    <button
                                        key={version.version}
                                        onClick={() => setSelectedVersion(version)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedVersion?.version === version.version
                                                ? 'bg-blue-100 text-blue-700 font-medium'
                                                : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                        data-oid="i-4ewmw"
                                    >
                                        {version.version}
                                        <div
                                            className="text-xs text-gray-500 mt-1"
                                            data-oid=".8d4hot"
                                        >
                                            {version.update_time}
                                        </div>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    {/* Main content */}
                    <main className="flex-1 p-8" data-oid="jp.b_zv">
                        {selectedVersion && (
                            <div className="max-w-4xl" data-oid="437vcov">
                                <div className="mb-8" data-oid="t.ogrp8">
                                    <div
                                        className="flex items-center space-x-4 mb-4"
                                        data-oid="gswu1mj"
                                    >
                                        <h2
                                            className="text-2xl font-bold text-gray-900"
                                            data-oid="ek.-0s_"
                                        >
                                            {selectedVersion.version}
                                        </h2>
                                        <span
                                            className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                                            data-oid="7:6o266"
                                        >
                                            最新版本
                                        </span>
                                    </div>
                                    <p className="text-gray-600" data-oid="k_kk6p1">
                                        发布时间: {selectedVersion.update_time}
                                    </p>
                                </div>

                                <div
                                    className="bg-white border border-gray-200 rounded-lg p-6 mb-6"
                                    data-oid="0jbyev:"
                                >
                                    <h3
                                        className="text-lg font-semibold text-gray-900 mb-4"
                                        data-oid="oar2a6o"
                                    >
                                        更新内容
                                    </h3>
                                    <div className="prose prose-sm max-w-none" data-oid="17sqnc2">
                                        <ReactMarkdown
                                            components={{
                                                h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                                                h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-5 mb-3" {...props} />,
                                                h3: ({node, ...props}) => <h3 className="text-lg font-medium mt-4 mb-2" {...props} />,
                                                p: ({node, ...props}) => <p className="text-gray-700 mb-3" {...props} />,
                                                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4" {...props} />,
                                                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4" {...props} />,
                                                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                                a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
                                                strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                                                em: ({node, ...props}) => <em className="italic" {...props} />,
                                            }}
                                        >
                                            {selectedVersion.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                <div
                                    className="bg-blue-50 border border-blue-200 rounded-lg p-6"
                                    data-oid="2emz:h7"
                                >
                                    <h3
                                        className="text-lg font-semibold text-blue-900 mb-4"
                                        data-oid="j7fkh43"
                                    >
                                        下载
                                    </h3>
                                    <a
                                        href={
                                            selectedVersion.download_url ||
                                            selectedVersion.downloadUrl
                                        }
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        data-oid="-qsqa90"
                                    >
                                        <span data-oid="_b6joma">
                                            下载 {selectedVersion.version}
                                        </span>
                                        <span className="ml-2" data-oid="f6zgmbv">
                                            ↗
                                        </span>
                                    </a>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-gray-50" data-oid="u:.cvmm">
                {/* Header */}
                <header className="bg-white shadow-sm border-b border-gray-200" data-oid="2-ibi4y">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" data-oid="66_eg9.">
                        <div className="py-6" data-oid="ya863op">
                            <h1 className="text-3xl font-bold text-gray-900" data-oid="4g-nge4">
                                项目更新日志聚合
                            </h1>
                            <p className="mt-2 text-gray-600" data-oid="cbkwp9a">
                                查看所有项目的最新更新和版本历史
                            </p>
                        </div>
                    </div>
                </header>

                {/* Error Banner */}
                {showErrorBanner && (
                    <div className="bg-yellow-50 border-b border-yellow-200" data-oid="wetbwyl">
                        <div
                            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3"
                            data-oid="9:3n1va"
                        >
                            <div className="flex items-center" data-oid="_56tle9">
                                <div className="text-yellow-600 mr-3" data-oid="rk1140d">
                                    ⚠️
                                </div>
                                <div className="flex-1" data-oid="0m0i8hq">
                                    <p className="text-sm text-yellow-800" data-oid="4lgdbkz">
                                        无法连接到后端服务，正在显示示例数据
                                    </p>
                                </div>
                                <button
                                    onClick={fetchProjects}
                                    className="text-sm text-yellow-800 hover:text-yellow-900 underline"
                                    data-oid="ehy.q.."
                                >
                                    重试连接
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-oid="3r3rf6a">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" data-oid="y8-voxx">
                        {/* Main Content */}
                        <div className="lg:col-span-3" data-oid="9ns1qfl">
                            <div
                                className="bg-white shadow-sm rounded-lg overflow-hidden"
                                data-oid="_s7vjmo"
                            >
                                <table
                                    className="min-w-full divide-y divide-gray-200"
                                    data-oid="g6eajj4"
                                >
                                    <thead className="bg-gray-50" data-oid="e9vlk8c">
                                        <tr data-oid="ga:_:wx">
                                            <th
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                data-oid="l8hbw3r"
                                            >
                                                项目
                                            </th>
                                            <th
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                data-oid="32hk_lj"
                                            >
                                                最新版本
                                            </th>
                                            <th
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                data-oid="nb-_:g6"
                                            >
                                                最新更新时间
                                            </th>
                                            <th
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                data-oid="t4zg1bk"
                                            >
                                                操作
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody
                                        className="bg-white divide-y divide-gray-200"
                                        data-oid="j3zmcr1"
                                    >
                                        {projects.map((project) => (
                                            <tr
                                                key={project.id}
                                                className="hover:bg-gray-50 transition-colors"
                                                data-oid="tx58cs9"
                                            >
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap"
                                                    data-oid="cy:d7eu"
                                                >
                                                    <div
                                                        className="flex items-center"
                                                        data-oid="9corigy"
                                                    >
                                                        <span
                                                            className="text-2xl mr-3"
                                                            data-oid="n153ksl"
                                                        >
                                                            {project.icon}
                                                        </span>
                                                        <div data-oid="84.kn-b">
                                                            <div
                                                                className="text-sm font-medium text-gray-900"
                                                                data-oid="q77ldn."
                                                            >
                                                                {project.name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap"
                                                    data-oid="zz3ppr:"
                                                >
                                                    <span
                                                        className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                                                        data-oid="t6_4k01"
                                                    >
                                                        {project.latest_version}
                                                    </span>
                                                </td>
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                                    data-oid="2p4ymx7"
                                                >
                                                    {project.latest_update_time}
                                                </td>
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap text-sm font-medium"
                                                    data-oid="rbm:46z"
                                                >
                                                    <button
                                                        onClick={() => handleProjectClick(project)}
                                                        className="text-blue-600 hover:text-blue-900 transition-colors"
                                                        data-oid="cd3d02c"
                                                    >
                                                        查看详情
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {projects.length === 0 && (
                                <div className="text-center py-12" data-oid="z8fmqdg">
                                    <p className="text-gray-500" data-oid="ivjt39e">
                                        暂无项目数据
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}