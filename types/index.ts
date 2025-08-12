// API相关类型定义
export interface ApiVersion {
    id?: number;
    project_id?: number;
    version: string;
    update_time: string;
    content: string;
    download_url: string;
}

export interface ApiProject {
    id: number;
    icon: string;
    name: string;
    latest_version: string;
    latest_update_time: string;
    versions: ApiVersion[];
}

// 前端使用的类型（保持向后兼容）
export interface Version extends ApiVersion {}
export interface Project extends ApiProject {}

// 项目创建类型
export interface ProjectCreate {
    icon: string;
    name: string;
    latest_version: string;
    latest_update_time: string;
}

export interface VersionCreate {
    project_id: number;
    version: string;
    update_time: string;
    content: string;
    download_url: string;
}

// 错误处理类型
export interface ApiError extends Error {
    status?: number;
    statusText?: string;
    code?: string;
}

// 广告相关类型
export interface AdConfig {
    id: string;
    size: string;
    slot: string;
    format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
    responsive?: boolean;
}

export interface AdAnalytics {
    impressions: number;
    clicks: number;
    revenue: number;
    ctr: number;
}

export interface AdPerformance {
    adId: string;
    adType: string;
    impressions: number;
    clicks: number;
    ctr: number;
    revenue: number;
}

// 分析数据类型
export interface AnalyticsData {
    event: 'impression' | 'click';
    adId: string;
    adType: string;
    timestamp: number;
    userAgent: string;
    url: string;
    referrer?: string;
    screenResolution?: string;
    viewportSize?: string;
}

// API响应类型
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// 分页类型
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
