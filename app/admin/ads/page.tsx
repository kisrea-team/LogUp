'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import AdminCard from '@/components/admin/AdminCard';
import StatCard from '@/components/admin/StatCard';

interface AdPerformance {
    adId: string;
    adType: string;
    impressions: number;
    clicks: number;
    ctr: number;
    revenue: number;
}

const TIME_RANGES = [
    { value: '24h', label: '24 小时' },
    { value: '7d', label: '7 天' },
    { value: '30d', label: '30 天' },
];

export default function AdAdminPage() {
    const [adPerformance, setAdPerformance] = useState<AdPerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

    const fetchAdPerformance = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            // 统计接口尚未接入，失败时显示空状态
            const response = await apiFetch(`/analytics?timeRange=${selectedTimeRange}`);
            if (!response.ok) {
                setAdPerformance([]);
                return;
            }
            const data = await response.json().catch(() => ({}));
            setAdPerformance(Array.isArray(data?.adPerformance) ? data.adPerformance : []);
        } catch (err) {
            setAdPerformance([]);
        } finally {
            setLoading(false);
        }
    }, [selectedTimeRange]);

    useEffect(() => {
        fetchAdPerformance();
    }, [fetchAdPerformance]);

    const totalRevenue = adPerformance.reduce((sum, ad) => sum + ad.revenue, 0);
    const totalImpressions = adPerformance.reduce((sum, ad) => sum + ad.impressions, 0);
    const totalClicks = adPerformance.reduce((sum, ad) => sum + ad.clicks, 0);
    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* 头部 */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">广告管理</h1>
                <p className="text-sm text-gray-500 mt-1">广告位与投放统计</p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="总收入" value={`¥${totalRevenue.toFixed(2)}`} sub={TIME_RANGES.find((r) => r.value === selectedTimeRange)?.label} delay={0} />
                <StatCard label="总展示" value={totalImpressions.toLocaleString()} delay={0.05} />
                <StatCard label="总点击" value={totalClicks.toLocaleString()} delay={0.1} />
                <StatCard label="平均 CTR" value={`${averageCTR.toFixed(2)}%`} delay={0.15} />
            </div>

            {/* 时间范围 + 广告位性能 */}
            <AdminCard
                title="广告位性能"
                description="按广告位查看展示 / 点击 / 收入"
                className=""
            >
                <div className="px-6 pt-4 pb-2 flex items-center gap-2 border-b border-gray-100">
                    {TIME_RANGES.map((range) => (
                        <button
                            key={range.value}
                            onClick={() => setSelectedTimeRange(range.value)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                selectedTimeRange === range.value
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-400 text-sm mt-3">加载中...</p>
                    </div>
                ) : adPerformance.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="text-4xl mb-3">📊</div>
                        <p className="text-gray-500 font-medium">暂无广告统计</p>
                        <p className="text-gray-400 text-sm mt-1">
                            广告统计接口尚未接入。接入后这里将展示各广告位的展示、点击与收入数据。
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">广告位 ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">展示</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">点击</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">收入</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-50">
                                {adPerformance.map((ad) => (
                                    <tr key={ad.adId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{ad.adId}</td>
                                        <td className="px-6 py-3 text-sm text-gray-500">{ad.adType}</td>
                                        <td className="px-6 py-3 text-sm text-gray-600 tabular-nums">{ad.impressions.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-sm text-gray-600 tabular-nums">{ad.clicks.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-sm tabular-nums">
                                            <span className={`font-medium ${ad.ctr >= 3 ? 'text-green-600' : ad.ctr >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {ad.ctr.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right tabular-nums">¥{ad.revenue.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </AdminCard>
        </div>
    );
}
