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
    versions: Version[];
}

interface ProjectDetailProps {
    project: Project;
    version: Version | null;
    setVersion: (v: Version) => void;
    onBack: () => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, version, setVersion, onBack }) => {
    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={onBack}
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

            <div className="max-w-7xl mx-auto flex">
                {/* Sidebar */}
                <aside className="w-64 bg-gray-50 min-h-screen border-r border-gray-200">
                    <div className="p-4">
                        <h2 className="text-sm font-medium text-gray-900 mb-4">版本历史</h2>
                        <nav className="space-y-1">
                            {project.versions.map((v) => (
                                <button
                                    key={v.version}
                                    onClick={() => setVersion(v)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                        version?.version === v.version
                                            ? 'bg-blue-100 text-blue-700 font-medium'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    {v.version}
                                    <div className="text-xs text-gray-500 mt-1">
                                        {v.update_time}
                                    </div>
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 p-8">
                    {version && (
                        <div className="max-w-4xl">
                            <div className="mb-8">
                                <div className="flex items-center space-x-4 mb-4">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {version.version}
                                    </h2>
                                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                                        最新版本
                                    </span>
                                </div>
                                <p className="text-gray-600">发布时间: {version.update_time}</p>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    更新内容
                                </h3>
                                <div className="prose prose-sm max-w-none">
                                    <ReactMarkdown>{version.content}</ReactMarkdown>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-blue-900 mb-4">下载</h3>
                                <a
                                    href={version.download_url || version.downloadUrl}
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <span>下载 {version.version}</span>
                                    <span className="ml-2">↗</span>
                                </a>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ProjectDetail;
