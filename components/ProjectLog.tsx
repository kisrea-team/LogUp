/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2025-11-24
 * @FilePath: /LogUp/components/ProjectLog.tsx
 * Helllllloo!
 */
import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { RenderIcon } from '@/components/utils/renderIcon';
import { ContentTranslator } from '@/components/ContentTranslator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

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
    // Mobile Version Selector JSX
    const renderMobileVersionSelector = () => (
        <div className="md:hidden mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                选择版本
            </label>
            <Select
                value={selectedVersion?.version || ''}
                onValueChange={(value) => {
                    const version = selectedProject.versions.find((v) => v.version === value);
                    if (version) setSelectedVersion(version);
                }}
            >
                <SelectTrigger className="select-trigger-full bg-card border border-border rounded-md shadow-sm">
                    <SelectValue placeholder="选择版本" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border rounded-md shadow-lg">
                    {selectedProject.versions.map((version) => (
                        <SelectItem
                            key={version.version}
                            value={version.version}
                            className="hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <div className="flex justify-between items-center w-full">
                                <span>{version.version}</span>
                                <span className="text-xs text-gray-500 ml-2 dark:text-gray-400">
                                    {version.update_time}
                                </span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row relative">
            {/* Sidebar - Desktop Only */}
            <div className="hidden md:block w-64 fixed h-screen overflow-y-auto border-r border-gray-200 top-[65px] bg-background z-20 pb-20">
                <div className="p-4">
                    <h2 className="text-sm font-medium text-gray-900 mb-4 dark:text-gray-100">版本历史</h2>
                    <nav className="space-y-1">
                        {selectedProject.versions.map((version) => (
                            <button
                                key={version.version}
                                onClick={() => setSelectedVersion(version)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedVersion?.version === version.version
                                    ? 'bg-blue-100 text-blue-700 font-medium dark:bg-blue-900 dark:text-blue-100'
                                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                                    }`}
                            >
                                {version.version}
                                <div className="text-xs text-gray-500 mt-1 dark:text-gray-500">
                                    {version.update_time}
                                </div>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Main content */}
            <main className="flex-1 p-4 md:p-8 md:ml-64 min-w-0">
                {/* Mobile Version Selector */}
                {renderMobileVersionSelector()}

                {/* Project Info */}
                <div className="">
                    <div className="max-w-4xl mb-8">
                        <div className=" border border-gray-200 rounded-lg p-6">
                            <div className="flex items-start space-x-4 mb-4">
                                <span className="text-4xl">
                                    <RenderIcon icon={selectedProject.icon} />
                                </span>
                                <div className="flex-1">
                                    <h1 className="text-2xl font-bold mb-2">
                                        {selectedProject.name}
                                    </h1>
                                    <p className="text-gray-600 mb-3 dark:text-gray-300">
                                        {selectedProject.summar || '暂无简介'}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                        <span>作者: {selectedProject.author || '未知'}</span>
                                        <span>类型: {selectedProject.type || '未分类'}</span>
                                        <span>更新时间: {selectedProject.latest_update_time}</span>
                                    </div>
                                </div>
                            </div>
                            {selectedProject.describe && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <h3 className="text-sm font-medium text-gray-900 mb-2 dark:text-white">
                                        项目介绍
                                    </h3>
                                    <p className="">{selectedProject.describe}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 版本详情 */}
                    {selectedVersion && (
                        <motion.div
                            className="max-w-4xl"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                        >
                            {/* 版本标题 */}
                            <div className="mb-6">
                                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {selectedVersion.version}
                                    </h2>
                                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full w-fit dark:bg-green-900 dark:text-green-100">
                                        最新版本
                                    </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400">
                                    发布时间: {selectedVersion.update_time}
                                </p>
                            </div>

                            <div className=" border border-gray-200 rounded-lg p-6 mb-6">
                                <ContentTranslator content={selectedVersion.content} />
                            </div>

                            {/* 下载 */}
                            <motion.div
                                className="bg-blue-50 border border-blue-200 rounded-lg p-6 dark:bg-blue-900/20 dark:border-blue-800"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.3 }}
                            >
                                <h3 className="text-lg font-semibold text-blue-900 mb-4 dark:text-blue-100">
                                    下载
                                </h3>
                                <motion.a
                                    href={
                                        selectedVersion.download_url || selectedVersion.downloadUrl
                                    }
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <span>下载 {selectedVersion.version}</span>
                                    <span className="ml-2">↗</span>
                                </motion.a>
                            </motion.div>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ProjectLog;
