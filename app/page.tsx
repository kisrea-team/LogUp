'use client';

import { useState, useEffect } from 'react';

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
                            downloadUrl: 'https://example.com/download/v2.1.0'
                        },
                        {
                            version: 'v2.0.5',
                            updateTime: '2024-01-10',
                            content: '修复登录问题\n更新依赖包\n改进UI界面',
                            downloadUrl: 'https://example.com/download/v2.0.5'
                        },
                        {
                            version: 'v2.0.0',
                            updateTime: '2024-01-01',
                            content: '重大版本更新\n全新架构设计\n支持多语言',
                            downloadUrl: 'https://example.com/download/v2.0.0'
                        }
                    ]
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
                            downloadUrl: 'https://example.com/download/beta-v1.5.2'
                        },
                        {
                            version: 'v1.5.1',
                            updateTime: '2024-01-08',
                            content: '紧急修复\n安全补丁\n稳定性改进',
                            downloadUrl: 'https://example.com/download/beta-v1.5.1'
                        }
                    ]
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
                            downloadUrl: 'https://example.com/download/gamma-v3.0.1'
                        }
                    ]
                }
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">加载中...</p>
                </div>
            </div>
        );
    }

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
                                    <h1 className="text-xl font-semibold text-gray-900">{selectedProject.name}</h1>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="max-w-7xl mx-auto flex">
                    {/* Sidebar */}
                    <aside className="w-64 bg-gray-50 min-h-screen border-r border-gray-200">
                        <div className="p-4">
                            <h2 className="text-sm font-medium text-gray-900 mb-4">版本历史</h2>
                            <nav className="space-y-1">
                                {selectedProject.versions.map((version) => (
                                    <button
                                        key={version.version}
                                        onClick={() => setSelectedVersion(version)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                            selectedVersion?.version === version.version
                                                ? 'bg-blue-100 text-blue-700 font-medium'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        {version.version}
                                        <div className="text-xs text-gray-500 mt-1">
                                            {version.updateTime}
                                        </div>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    {/* Main content */}
                    <main className="flex-1 p-8">
                        {selectedVersion && (
                            <div className="max-w-4xl">
                                <div className="mb-8">
                                    <div className="flex items-center space-x-4 mb-4">
                                        <h2 className="text-2xl font-bold text-gray-900">
                                            {selectedVersion.version}
                                        </h2>
                                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                                            最新版本
                                        </span>
                                    </div>
                                    <p className="text-gray-600">
                                        发布时间: {selectedVersion.updateTime}
                                    </p>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">更新内容</h3>
                                    <div className="prose prose-sm max-w-none">
                                        {selectedVersion.content.split('\n').map((line, index) => (
                                            <p key={index} className="text-gray-700 mb-2">
                                                {line}
                                            </p>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold text-blue-900 mb-4">下载</h3>
                                    <a
                                        href={selectedVersion.downloadUrl}
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <span>下载 {selectedVersion.version}</span>
                                        <span className="ml-2">↗</span>
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

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    项目
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    最新版本
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    最新更新时间
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    操作
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {projects.map((project) => (
                                <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <span className="text-2xl mr-3">{project.icon}</span>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {project.name}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                            {project.latestVersion}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {project.latestUpdateTime}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleProjectClick(project)}
                                            className="text-blue-600 hover:text-blue-900 transition-colors"
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
                    <div className="text-center py-12">
                        <p className="text-gray-500">暂无项目数据</p>
                    </div>
                )}
            </main>
        </div>
    );
}

{
  id: number,
  icon: string,
  name: string,
  latestVersion: string,
  latestUpdateTime: string,
  versions: [
    {
      version: string,
      updateTime: string,
      content: string,
      downloadUrl: string
    }
  ]
}