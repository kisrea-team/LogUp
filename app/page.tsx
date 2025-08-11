'use client';

import { useState, useEffect } from 'react';
import LazyAd from '@/components/LazyAd';
import { adConfigs } from '@/lib/adConfigs';

export default function Page() {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedVersion, setSelectedVersion] = useState(null);
    const [loading, setLoading] = useState(true);

    // Mock data - replace with actual API calls
    useEffect(() => {
        // Simulate API call
        setTimeout(() => {
            const mockProjects = [
                {
                    id: 1,
                    icon: '🚀',
                    name: 'Project Alpha',
                    latestVersion: 'v2.1.0',
                    latestUpdateTime: '2024-01-15',
                    versions: [
                        {
                            version: 'v2.1.0',
                            updateTime: '2024-01-15',
                            content: '新增用户权限管理功能\n修复已知安全漏洞\n优化性能表现',
                            downloadUrl: 'https://example.com/download/v2.1.0',
                        },
                        {
                            version: 'v2.0.5',
                            updateTime: '2024-01-10',
                            content: '修复登录问题\n更新依赖包\n改进UI界面',
                            downloadUrl: 'https://example.com/download/v2.0.5',
                        },
                        {
                            version: 'v2.0.0',
                            updateTime: '2024-01-01',
                            content: '重大版本更新\n全新架构设计\n支持多语言',
                            downloadUrl: 'https://example.com/download/v2.0.0',
                        },
                    ],
                },
                {
                    id: 2,
                    icon: '⚡',
                    name: 'Project Beta',
                    latestVersion: 'v1.5.2',
                    latestUpdateTime: '2024-01-12',
                    versions: [
                        {
                            version: 'v1.5.2',
                            updateTime: '2024-01-12',
                            content: '性能优化\n修复内存泄漏\n新增API接口',
                            downloadUrl: 'https://example.com/download/beta-v1.5.2',
                        },
                        {
                            version: 'v1.5.1',
                            updateTime: '2024-01-08',
                            content: '紧急修复\n安全补丁\n稳定性改进',
                            downloadUrl: 'https://example.com/download/beta-v1.5.1',
                        },
                    ],
                },
                {
                    id: 3,
                    icon: '🔧',
                    name: 'Project Gamma',
                    latestVersion: 'v3.0.1',
                    latestUpdateTime: '2024-01-14',
                    versions: [
                        {
                            version: 'v3.0.1',
                            updateTime: '2024-01-14',
                            content: '修复关键错误\n改进用户体验\n新增配置选项',
                            downloadUrl: 'https://example.com/download/gamma-v3.0.1',
                        },
                    ],
                },
            ];

            setProjects(mockProjects);
            setLoading(false);
        }, 1000);
    }, []);

    const handleProjectClick = (project) => {
        setSelectedProject(project);
        setSelectedVersion(project.versions[0]); // Select latest version by default
    };

    const handleBackToList = () => {
        setSelectedProject(null);
        setSelectedVersion(null);
    };

    if (loading) {
        return (
            <div
                className="min-h-screen bg-gray-50 flex items-center justify-center"
                data-oid="n34f.hl"
            >
                <div className="text-center" data-oid="73h0y8.">
                    <div
                        className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
                        data-oid="0:rkcc6"
                    ></div>
                    <p className="text-gray-600" data-oid="kn6rv.-">
                        加载中...
                    </p>
                </div>
            </div>
        );
    }

    if (selectedProject) {
        return (
            <div className="min-h-screen bg-white" data-oid="mtv6h.u">
                {/* Header */}
                <header
                    className="border-b border-gray-200 bg-white sticky top-0 z-10"
                    data-oid="49a.m6c"
                >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" data-oid="bg50:_2">
                        <div className="flex items-center justify-between h-16" data-oid="rr41xab">
                            <div className="flex items-center space-x-4" data-oid="y2rki.l">
                                <button
                                    onClick={handleBackToList}
                                    className="text-blue-600 hover:text-blue-800 flex items-center space-x-2"
                                    data-oid="w0xs7ft"
                                >
                                    <span data-oid="hetyvt9">←</span>
                                    <span data-oid="jh7d.wc">返回项目列表</span>
                                </button>
                                <div className="h-6 w-px bg-gray-300" data-oid="yodxbuz"></div>
                                <div className="flex items-center space-x-3" data-oid="-t_3zqh">
                                    <span className="text-2xl" data-oid="arhudsi">
                                        {selectedProject.icon}
                                    </span>
                                    <h1
                                        className="text-xl font-semibold text-gray-900"
                                        data-oid="3.3b.e-"
                                    >
                                        {selectedProject.name}
                                    </h1>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="max-w-7xl mx-auto flex" data-oid="x:bhu9u">
                    {/* Sidebar */}
                    <aside
                        className="w-64 bg-gray-50 min-h-screen border-r border-gray-200"
                        data-oid="p6x_c3z"
                    >
                        <div className="p-4" data-oid="5cm2966">
                            <h2
                                className="text-sm font-medium text-gray-900 mb-4"
                                data-oid=":zwuahx"
                            >
                                版本历史
                            </h2>
                            <nav className="space-y-1" data-oid="1..h5cr">
                                {selectedProject.versions.map((version) => (
                                    <button
                                        key={version.version}
                                        onClick={() => setSelectedVersion(version)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                            selectedVersion?.version === version.version
                                                ? 'bg-blue-100 text-blue-700 font-medium'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                        data-oid="7o6byq9"
                                    >
                                        {version.version}
                                        <div
                                            className="text-xs text-gray-500 mt-1"
                                            data-oid="ifpsbo_"
                                        >
                                            {version.updateTime}
                                        </div>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    {/* Main content */}
                    <main className="flex-1 p-8" data-oid="okpvqq3">
                        {selectedVersion && (
                            <div className="max-w-4xl" data-oid="y1:mxte">
                                <div className="mb-8" data-oid="d0kgip2">
                                    <div
                                        className="flex items-center space-x-4 mb-4"
                                        data-oid=".99cba."
                                    >
                                        <h2
                                            className="text-2xl font-bold text-gray-900"
                                            data-oid="5q7mxkn"
                                        >
                                            {selectedVersion.version}
                                        </h2>
                                        <span
                                            className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                                            data-oid="4fj_05h"
                                        >
                                            最新版本
                                        </span>
                                    </div>
                                    <p className="text-gray-600" data-oid="7mldihl">
                                        发布时间: {selectedVersion.updateTime}
                                    </p>
                                </div>

                                <div
                                    className="bg-white border border-gray-200 rounded-lg p-6 mb-6"
                                    data-oid="uffg-qo"
                                >
                                    <h3
                                        className="text-lg font-semibold text-gray-900 mb-4"
                                        data-oid="p5y.h-a"
                                    >
                                        更新内容
                                    </h3>
                                    <div className="prose prose-sm max-w-none" data-oid="3my0t:i">
                                        {selectedVersion.content.split('\n').map((line, index) => (
                                            <p
                                                key={index}
                                                className="text-gray-700 mb-2"
                                                data-oid="x.o54fe"
                                            >
                                                {line}
                                            </p>
                                        ))}
                                    </div>
                                </div>

                                <div
                                    className="bg-blue-50 border border-blue-200 rounded-lg p-6"
                                    data-oid="otbf4zz"
                                >
                                    <h3
                                        className="text-lg font-semibold text-blue-900 mb-4"
                                        data-oid="fqyuwkl"
                                    >
                                        下载
                                    </h3>
                                    <a
                                        href={selectedVersion.downloadUrl}
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        data-oid="k96bhc-"
                                    >
                                        <span data-oid="39pxu:s">
                                            下载 {selectedVersion.version}
                                        </span>
                                        <span className="ml-2" data-oid="hj:6jhp">
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
        <div className="min-h-screen bg-gray-50" data-oid="tt2i4.m">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200" data-oid="3_h10hb">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" data-oid="ni_63xp">
                    <div className="py-6" data-oid="rr51vmj">
                        <h1 className="text-3xl font-bold text-gray-900" data-oid="c0wxhcs">
                            项目更新日志聚合
                        </h1>
                        <p className="mt-2 text-gray-600" data-oid="y0bnh4f">
                            查看所有项目的最新更新和版本历史
                        </p>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-oid="jozlfks">
                <div className="bg-white shadow-sm rounded-lg overflow-hidden" data-oid="9r4pv1x">
                    <table className="min-w-full divide-y divide-gray-200" data-oid=":7zz8a-">
                        <thead className="bg-gray-50" data-oid="rwnw.40">
                            <tr data-oid="xp.wzph">
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    data-oid="ysbd53l"
                                >
                                    项目
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    data-oid="4y:9__l"
                                >
                                    最新版本
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    data-oid=".o9h0ch"
                                >
                                    最新更新时间
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    data-oid=".icd_bb"
                                >
                                    操作
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200" data-oid="3hhash5">
                            {projects.map((project) => (
                                <tr
                                    key={project.id}
                                    className="hover:bg-gray-50 transition-colors"
                                    data-oid="jt046p1"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap" data-oid="97enoy1">
                                        <div className="flex items-center" data-oid="5s-.9re">
                                            <span className="text-2xl mr-3" data-oid="3u:xlt6">
                                                {project.icon}
                                            </span>
                                            <div data-oid="-v:67ov">
                                                <div
                                                    className="text-sm font-medium text-gray-900"
                                                    data-oid="4:2m7mr"
                                                >
                                                    {project.name}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap" data-oid="_xl4x:7">
                                        <span
                                            className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                                            data-oid="fzv:6qv"
                                        >
                                            {project.latestVersion}
                                        </span>
                                    </td>
                                    <td
                                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                        data-oid="ngy_0w."
                                    >
                                        {project.latestUpdateTime}
                                    </td>
                                    <td
                                        className="px-6 py-4 whitespace-nowrap text-sm font-medium"
                                        data-oid="fr71x-p"
                                    >
                                        <button
                                            onClick={() => handleProjectClick(project)}
                                            className="text-blue-600 hover:text-blue-900 transition-colors"
                                            data-oid="0hufv:r"
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
                    <div className="text-center py-12" data-oid="xhd7wk.">
                        <p className="text-gray-500" data-oid="iutubxp">
                            暂无项目数据
                        </p>
                    </div>
                )}
            </main{/* Mobile Floating Ad */}
            <div className="fixed bottom-4 left-4 right-4 lg:hidden z-50">
                <div className="bg-white rounded-lg shadow-lg">
                    <div className="flex justify-between items-center p-2">
                        <div className="flex-1">
                            <LazyAd 
                                config={adConfigs.mobileFloating}
                                adType="mobile"
                                className="min-h-[50px]"
                            />
                        </div>
                        <button 
                            className="text-gray-400 hover:text-gray-600 ml-2 p-1"
                            onClick={() => {
                                const floatingAd = document.querySelector('.fixed.bottom-4') as HTMLElement;
                                if (floatingAd) floatingAd.style.display = 'none';
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}
