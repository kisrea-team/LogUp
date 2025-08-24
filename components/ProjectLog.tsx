/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2025-08-23
 * @FilePath: /LogUp/components/ProjectLog.tsx
 * Helllllloo!
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';

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

interface ProjectLogProps {
    selectedProject: Project;
    selectedVersion: Version | null;
    setSelectedVersion: (version: Version) => void;
}

const ProjectLog: React.FC<ProjectLogProps> = ({
    selectedProject,
    selectedVersion,
    setSelectedVersion,
}) => {
    return (
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
                                    {version.update_time}
                                </div>
                            </button>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 p-8 ">
                {/* Project Info */}
                <div className="fixed">
                    <div className="max-w-4xl mb-8">
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <div className="flex items-start space-x-4 mb-4">
                                <span className="text-4xl">{selectedProject.icon}</span>
                                <div className="flex-1">
                                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                        {selectedProject.name}
                                    </h1>
                                    <p className="text-gray-600 mb-3">
                                        {selectedProject.summar || '暂无简介'}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span>作者: {selectedProject.author || '未知'}</span>
                                        <span>类型: {selectedProject.type || '未分类'}</span>
                                        <span>更新时间: {selectedProject.latest_update_time}</span>
                                    </div>
                                </div>
                            </div>
                            {selectedProject.describe && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                                        项目介绍
                                    </h3>
                                    <p className="text-gray-700">{selectedProject.describe}</p>
                                </div>
                            )}
                        </div>
                    </div>

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
                                    发布时间: {selectedVersion.update_time}
                                </p>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    更新内容
                                </h3>
                                <div className="prose prose-sm max-w-none">
                                    <ReactMarkdown
                                        components={{
                                            h1: ({ node, ...props }) => (
                                                <h1
                                                    className="text-2xl font-bold mt-6 mb-4"
                                                    {...props}
                                                />
                                            ),
                                            h2: ({ node, ...props }) => (
                                                <h2
                                                    className="text-xl font-semibold mt-5 mb-3"
                                                    {...props}
                                                />
                                            ),
                                            h3: ({ node, ...props }) => (
                                                <h3
                                                    className="text-lg font-medium mt-4 mb-2"
                                                    {...props}
                                                />
                                            ),
                                            p: ({ node, ...props }) => (
                                                <p className="text-gray-700 mb-3" {...props} />
                                            ),
                                            ul: ({ node, ...props }) => (
                                                <ul className="list-disc pl-5 mb-4" {...props} />
                                            ),
                                            ol: ({ node, ...props }) => (
                                                <ol className="list-decimal pl-5 mb-4" {...props} />
                                            ),
                                            li: ({ node, ...props }) => (
                                                <li className="mb-1" {...props} />
                                            ),
                                            a: ({ node, ...props }) => (
                                                <a
                                                    className="text-blue-600 hover:underline"
                                                    {...props}
                                                />
                                            ),
                                            strong: ({ node, ...props }) => (
                                                <strong className="font-semibold" {...props} />
                                            ),
                                            em: ({ node, ...props }) => (
                                                <em className="italic" {...props} />
                                            ),
                                        }}
                                    >
                                        {selectedVersion.content}
                                    </ReactMarkdown>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-blue-900 mb-4">下载</h3>
                                <a
                                    href={
                                        selectedVersion.download_url || selectedVersion.downloadUrl
                                    }
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
                </div>
            </main>
        </div>
    );
};

export default ProjectLog;
