'use client';

import { useState, useEffect } from 'react';
// AdAnalytics 组件已被移除，相关功能已整合到页面中
import { apiFetch, getApiBaseUrl } from '@/lib/api';

const API_BASE_URL = getApiBaseUrl();

interface AdPerformance {
    adId: string;
    adType: string;
    impressions: number;
    clicks: number;
    ctr: number;
    revenue: number;
}

export default function AdAdminPage() {
    const [adPerformance, setAdPerformance] = useState<AdPerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

    useEffect(() => {
        fetchAdPerformance();
    }, [selectedTimeRange]);

    const fetchAdPerformance = async () => {
        try {
            setLoading(true);
            const response = await apiFetch(`/api/analytics?timeRange=${selectedTimeRange}`);
            const data = await response.json();

            // Use the adPerformance data from the API response
            if (data.adPerformance) {
                setAdPerformance(data.adPerformance);
            } else {
                // Fallback to empty array if no data
                setAdPerformance([]);
            }
        } catch (error) {
            console.error('获取广告性能数据失败:', error);
            // Fallback to empty array on error
            setAdPerformance([]);
        } finally {
            setLoading(false);
        }
    };

    const totalRevenue = adPerformance.reduce((sum, ad) => sum + ad.revenue, 0);
    const totalImpressions = adPerformance.reduce((sum, ad) => sum + ad.impressions, 0);
    const totalClicks = adPerformance.reduce((sum, ad) => sum + ad.clicks, 0);
    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">广告管理后台</h1>

                    {/* 时间范围选择器 */}
                    <div className="flex space-x-4 mb-6">
                        {['24h', '7d', '30d'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setSelectedTimeRange(range)}
                                className={`px-4 py-2 rounded-md ${
                                    selectedTimeRange === range
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700 border border-gray-300'
                                }`}
                            >
                                {range === '24h' ? '24小时' : range === '7d' ? '7天' : '30天'}
                            </button>
                        ))}
                    </div>

                    {/* 总览统计 */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="text-sm font-medium text-gray-500">总收入</div>
                            <div className="text-2xl font-bold text-green-600">
                                ¥{totalRevenue.toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="text-sm font-medium text-gray-500">总展示</div>
                            <div className="text-2xl font-bold text-blue-600">
                                {totalImpressions.toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="text-sm font-medium text-gray-500">总点击</div>
                            <div className="text-2xl font-bold text-purple-600">
                                {totalClicks.toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="text-sm font-medium text-gray-500">平均CTR</div>
                            <div className="text-2xl font-bold text-orange-600">
                                {averageCTR.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* 广告性能表格 */}
                <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">广告位性能</h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">加载中...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <div className="min-w-full divide-y divide-gray-200">
                                <div className="bg-gray-50">
                                    <div>
                                        <p>
                                            广告位ID
                                        </p>
                                        <p>
                                            类型
                                        </p>
                                        <p>
                                            展示次数
                                        </p>
                                        <p>
                                            点击次数
                                        </p>
                                        <p>
                                            点击率
                                        </p>
                                        <p>
                                            收入
                                        </p>
                                    </div>
                                </div>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {adPerformance.map((ad) => (
                                        <div key={ad.adId} className="hover:bg-gray-50">
                                            <p className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {ad.adId}
                                            </p>
                                            <p className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                                    {ad.adType}
                                                </span>
                                            </p>
                                            <p className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {ad.impressions.toLocaleString()}
                                            </p>
                                            <p className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {ad.clicks.toLocaleString()}
                                            </p>
                                            <p className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span
                                                    className={`font-medium ${
                                                        ad.ctr >= 3
                                                            ? 'text-green-600'
                                                            : ad.ctr >= 2
                                                              ? 'text-yellow-600'
                                                              : 'text-red-600'
                                                    }`}
                                                >
                                                    {ad.ctr.toFixed(2)}%
                                                </span>
                                            </p>
                                            <p className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                ¥{ad.revenue.toFixed(2)}
                                            </p>
                                        </div>
                                    ))}
                                </tbody>
                            </div>
                        </div>
                    )}
                </div>

                {/* 详细分析组件 */}
                {/* AdAnalytics 组件已被移除，相关功能已整合到页面中 */}
            </div>
        </div>
    );
}
