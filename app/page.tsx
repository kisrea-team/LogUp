'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// import ReactMarkdown from 'react-markdown';
import { apiFetch, getApiBaseUrl } from '@/lib/api';
import Loading from '@/components/Loading';
import Header from '@/components/Header';
import ProjectList from '@/components/ProjectList';
import Pagination from '@/components/Pagination';

const API_BASE_URL = getApiBaseUrl(); // Use relative path for Next.js rewrites

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

interface PaginatedResponse {
    data: Project[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}

export default function Page() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(10);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProjects, setTotalProjects] = useState(0);
    const [perPage, setPerPage] = useState(5);

    // 从API获取项目数据
    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async (page: number = currentPage) => {
        // Validate page number
        if (page < 1) page = 1;
        if (page > totalPages && totalPages > 0) page = totalPages;

        try {
            setLoading(true);
            setProgress(10); // 开始加载
            setErrorMessage(null);
            // 模拟网络延迟
            await new Promise((res) => setTimeout(res, 0));
            setProgress(40); // 请求已发出
            const response = await apiFetch(`/projects?page=${page}&per_page=${perPage}`);
            setProgress(60); // 已收到响应
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setProgress(90); // 数据已解析
            console.log('API Response:', data); // 添加调试日志

            // 处理不同的数据结构
            const projectsData = Array.isArray(data) ? data : data.data || data.projects || [];
            let totalPagesData = data.total_pages || data.totalPages;
            let totalItemsData = data.total || data.totalItems;
            let currentPageData = data.page || data.currentPage || page;

            // 如果后端没有返回分页信息，则在前端做兜底分页
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
        } catch (err) {
            console.error('获取项目数据失败:', err);
            setErrorMessage('无法连接到服务器，请确保后端服务正在运行');
            setProjects([]);
        } finally {
            setProgress(100);
            setTimeout(() => setLoading(false), 200); // 延迟关闭 loading，保证进度条动画
        }
    };

    // if (loading) {
    //     return <Loading progress={progress} />;
    // }

    // 如果有错误消息但仍有数据，显示警告横幅
    const showErrorBanner = errorMessage && projects.length > 0;

    return (
        <div className="min-h-screen bg-background">
            <Header />
            {/* Error Banner */}
            {showErrorBanner && (
                <div className="bg-yellow-50  border-yellow-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                        <div className="flex items-center">
                            <div className="text-yellow-600 mr-3">⚠️</div>
                            <div className="flex-1">
                                <p className="text-sm text-yellow-800">
                                    无法连接到后端服务，正在显示示例数据
                                </p>
                            </div>
                            <button
                                onClick={() => fetchProjects()}
                                className="text-sm text-yellow-800 hover:text-yellow-900 underline"
                            >
                                重试连接
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main content with animation */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Loading progress={progress} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <ProjectList projects={projects} />

                        {/* Pagination Controls */}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalProjects}
                            itemsPerPage={perPage}
                            onPageChange={fetchProjects}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
