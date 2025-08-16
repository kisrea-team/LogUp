'use client';

import { useState, useEffect } from 'react';
import AdAnalytics from '@/components/AdAnalytics';

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
            const response = await fetch(`/api/analytics?timeRange=${selectedTimeRange}`);
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
        <div className="min-h-screen bg-gray-50 p-8" data-oid="z2bdlu.">
            <div className="max-w-7xl mx-auto" data-oid="ot79q44">
                <div className="mb-8" data-oid="lfpryht">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4" data-oid="8m-8di1">
                        广告管理后台
                    </h1>

                    {/* 时间范围选择器 */}
                    <div className="flex space-x-4 mb-6" data-oid="5u64_-6">
                        {['24h', '7d', '30d'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setSelectedTimeRange(range)}
                                className={`px-4 py-2 rounded-md ${
                                    selectedTimeRange === range
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700 border border-gray-300'
                                }`}
                                data-oid="4viyh9h"
                            >
                                {range === '24h' ? '24小时' : range === '7d' ? '7天' : '30天'}
                            </button>
                        ))}
                    </div>

                    {/* 总览统计 */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" data-oid="mqfu:oo">
                        <div className="bg-white rounded-lg shadow p-6" data-oid="t.xqn41">
                            <div className="text-sm font-medium text-gray-500" data-oid="mk7pafk">
                                总收入
                            </div>
                            <div className="text-2xl font-bold text-green-600" data-oid="2i-_:s_">
                                ¥{totalRevenue.toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6" data-oid="48_x-qp">
                            <div className="text-sm font-medium text-gray-500" data-oid="pm59osa">
                                总展示
                            </div>
                            <div className="text-2xl font-bold text-blue-600" data-oid="s474hn.">
                                {totalImpressions.toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6" data-oid=":j449rv">
                            <div className="text-sm font-medium text-gray-500" data-oid="5g.h.0j">
                                总点击
                            </div>
                            <div className="text-2xl font-bold text-purple-600" data-oid="vcuylb-">
                                {totalClicks.toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6" data-oid="-0_oqwt">
                            <div className="text-sm font-medium text-gray-500" data-oid="euz8_:y">
                                平均CTR
                            </div>
                            <div className="text-2xl font-bold text-orange-600" data-oid="fw:5y.h">
                                {averageCTR.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* 广告性能表格 */}
                <div className="bg-white rounded-lg shadow overflow-hidden mb-8" data-oid="3.k3ayj">
                    <div className="px-6 py-4 border-b border-gray-200" data-oid="1742epw">
                        <h2 className="text-lg font-semibold text-gray-900" data-oid="ft8gyrt">
                            广告位性能
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center" data-oid="92lmggi">
                            <div
                                className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
                                data-oid="hjo:mij"
                            ></div>
                            <p className="text-gray-600" data-oid="gbcv.hr">
                                加载中...
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto" data-oid="qs3::1:">
                            <table
                                className="min-w-full divide-y divide-gray-200"
                                data-oid="mrq50nh"
                            >
                                <thead className="bg-gray-50" data-oid="lz.xlp-">
                                    <tr data-oid="n55me99">
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            data-oid="nsgq2m1"
                                        >
                                            广告位ID
                                        </th>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            data-oid="0vxflcd"
                                        >
                                            类型
                                        </th>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            data-oid="wikpz2i"
                                        >
                                            展示次数
                                        </th>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            data-oid="qtktjsz"
                                        >
                                            点击次数
                                        </th>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            data-oid="5di..7g"
                                        >
                                            点击率
                                        </th>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            data-oid="_77ed89"
                                        >
                                            收入
                                        </th>
                                    </tr>
                                </thead>
                                <tbody
                                    className="bg-white divide-y divide-gray-200"
                                    data-oid="azw1a7x"
                                >
                                    {adPerformance.map((ad) => (
                                        <tr
                                            key={ad.adId}
                                            className="hover:bg-gray-50"
                                            data-oid="7.zq9zq"
                                        >
                                            <td
                                                className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                                                data-oid="f1wdyne"
                                            >
                                                {ad.adId}
                                            </td>
                                            <td
                                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                                data-oid="c1h81it"
                                            >
                                                <span
                                                    className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                                                    data-oid="z.voo-d"
                                                >
                                                    {ad.adType}
                                                </span>
                                            </td>
                                            <td
                                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                                data-oid="6ylae90"
                                            >
                                                {ad.impressions.toLocaleString()}
                                            </td>
                                            <td
                                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                                data-oid="eg9v.x5"
                                            >
                                                {ad.clicks.toLocaleString()}
                                            </td>
                                            <td
                                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                                data-oid="ge4ybt6"
                                            >
                                                <span
                                                    className={`font-medium ${
                                                        ad.ctr >= 3
                                                            ? 'text-green-600'
                                                            : ad.ctr >= 2
                                                              ? 'text-yellow-600'
                                                              : 'text-red-600'
                                                    }`}
                                                    data-oid="e68k7m-"
                                                >
                                                    {ad.ctr.toFixed(2)}%
                                                </span>
                                            </td>
                                            <td
                                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium"
                                                data-oid="1ngodxx"
                                            >
                                                ¥{ad.revenue.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* 详细分析组件 */}
                <AdAnalytics data-oid="-.g5d7h" />
            </div>
        </div>
    );
}
