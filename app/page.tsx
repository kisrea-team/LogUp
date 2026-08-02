'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import Loading from '@/components/Loading';
import Header from '@/components/Header';
import ProjectList from '@/components/ProjectList';
import Pagination from '@/components/Pagination';
import FilterType from '@/components/utils/FilterType';

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
    tags?: string[];
    versions: Version[];
}

const SORT_OPTIONS = [
    { value: 'updated_desc', label: '最新更新' },
    { value: 'updated_asc', label: '最早更新' },
    { value: 'name_asc', label: '名称 A-Z' },
    { value: 'name_desc', label: '名称 Z-A' },
    { value: 'created_desc', label: '最新添加' },
];

export default function Page() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(10);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProjects, setTotalProjects] = useState(0);
    const [perPage] = useState(10);

    // Filter & sort state
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('updated_desc');
    const [filterType, setFilterType] = useState('');
    const [filterTag, setFilterTag] = useState('');
    const [availableTypes, setAvailableTypes] = useState<string[]>([]);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch available types once on mount
    useEffect(() => {
        apiFetch('/projects/types')
            .then((r) => r.json())
            .then((d) => { if (Array.isArray(d?.types)) setAvailableTypes(d.types); })
            .catch(() => { });
    }, []);

    const fetchProjects = useCallback(async (
        page: number,
        searchVal: string,
        sortVal: string,
        typeVal: string,
        tagVal: string = '',
    ) => {
        if (page < 1) page = 1;

        try {
            setLoading(true);
            setProgress(10);
            setErrorMessage(null);

            const params = new URLSearchParams({
                page: String(page),
                per_page: String(perPage),
            });
            if (searchVal) params.set('search', searchVal);
            if (sortVal) params.set('sort', sortVal);
            if (typeVal) params.set('type', typeVal);
            if (tagVal) params.set('tag', tagVal);

            setProgress(40);
            const response = await apiFetch(`/projects?${params}`);
            setProgress(60);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            setProgress(90);

            const projectsData = Array.isArray(data) ? data : data.data || data.projects || [];
            let totalPagesData = data.total_pages || data.totalPages;
            let totalItemsData = data.total || data.totalItems;
            let currentPageData = data.page || data.currentPage || page;

            if (!totalPagesData || !totalItemsData) {
                const total = projectsData.length;
                const pages = Math.max(1, Math.ceil(total / perPage));
                totalItemsData = total;
                totalPagesData = pages;
                currentPageData = Math.min(Math.max(1, currentPageData), pages);
                const start = (currentPageData - 1) * perPage;
                setProjects(projectsData.slice(start, start + perPage));
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
            setTimeout(() => setLoading(false), 200);
        }
    }, [perPage]);

    // Sync current filter state to URL (replaces history entry, no extra back-stack)
    const syncUrl = useCallback((page: number, searchVal: string, sortVal: string, typeVal: string, tagVal: string) => {
        const params = new URLSearchParams();
        if (page > 1) params.set('page', String(page));
        if (searchVal) params.set('search', searchVal);
        if (sortVal && sortVal !== 'updated_desc') params.set('sort', sortVal);
        if (typeVal) params.set('type', typeVal);
        if (tagVal) params.set('tag', tagVal);
        const qs = params.toString();
        router.replace(qs ? `/?${qs}` : '/', { scroll: false });
    }, [router]);

    // Initial load - read all filter params from URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const pageParam = Math.max(1, parseInt(urlParams.get('page') || '1', 10));
        const searchParam = urlParams.get('search') || '';
        const sortParam = urlParams.get('sort') || 'updated_desc';
        const typeParam = urlParams.get('type') || '';
        const tagParam = urlParams.get('tag') || '';
        if (searchParam) setSearch(searchParam);
        if (sortParam !== 'updated_desc') setSortBy(sortParam);
        if (typeParam) setFilterType(typeParam);
        if (tagParam) setFilterTag(tagParam);
        fetchProjects(pageParam, searchParam, sortParam, typeParam, tagParam);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Search with debounce
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearch(val);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            setCurrentPage(1);
            fetchProjects(1, val, sortBy, filterType, filterTag);
            syncUrl(1, val, sortBy, filterType, filterTag);
        }, 350);
    };

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSortBy(val);
        setCurrentPage(1);
        fetchProjects(1, search, val, filterType, filterTag);
        syncUrl(1, search, val, filterType, filterTag);
    };

    const handleTypeChange = (val: string) => {
        setFilterType(val);
        setCurrentPage(1);
        fetchProjects(1, search, sortBy, val, filterTag);
        syncUrl(1, search, sortBy, val, filterTag);
    };

    const handleTagClick = (tag: string) => {
        const newTag = filterTag === tag ? '' : tag;
        setFilterTag(newTag);
        setCurrentPage(1);
        fetchProjects(1, search, sortBy, filterType, newTag);
        syncUrl(1, search, sortBy, filterType, newTag);
    };

    const handlePageChange = (page: number) => {
        fetchProjects(page, search, sortBy, filterType, filterTag);
        syncUrl(page, search, sortBy, filterType, filterTag);
    };

    const showErrorBanner = errorMessage && projects.length > 0;

    return (
        <div className="min-h-screen bg-background">
            <Header />

            {/* Error Banner */}
            {showErrorBanner && (
                <div className="bg-yellow-50 border-yellow-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                        <div className="flex items-center">
                            <div className="text-yellow-600 mr-3">⚠️</div>
                            <p className="flex-1 text-sm text-yellow-800">无法连接到后端服务，正在显示示例数据</p>
                            <button
                                onClick={() => fetchProjects(currentPage, search, sortBy, filterType)}
                                className="text-sm text-yellow-800 hover:text-yellow-900 underline"
                            >
                                重试连接
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter bar */}
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
                <div className="flex flex-wrap gap-2 items-center">
                    {/* <input
                        type="text"
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="搜索项目、作者..."
                        className="flex-1 min-w-[180px] max-w-xs px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500"
                    /> */}

                    {availableTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                            <FilterType filterType={filterType} handleTypeChange={handleTypeChange} availableTypes={availableTypes} />
                        </div>
                    )}

                    {/* Sort select */}
                    <select
                        value={sortBy}
                        onChange={handleSortChange}
                        className="ml-auto px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        {SORT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                {/* Active filter hint */}
                {(search || filterType || filterTag) && !loading && (
                    <p className="mt-1.5 text-xs text-gray-400">
                        共 {totalProjects} 个结果
                        {search && <span>，关键词「{search}」</span>}
                        {filterType && <span>，类型「{filterType}」</span>}
                        {filterTag && <span>，标签「#{filterTag}」</span>}
                        <button
                            onClick={() => {
                                setSearch('');
                                setFilterType('');
                                setFilterTag('');
                                fetchProjects(1, '', sortBy, '', '');
                            }}
                            className="ml-2 text-blue-500 hover:underline"
                        >
                            清除筛选
                        </button>
                    </p>
                )}
            </div>

            {/* Main content */}
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
                        <ProjectList projects={projects} onTagClick={handleTagClick} />
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalProjects}
                            itemsPerPage={perPage}
                            onPageChange={handlePageChange}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
