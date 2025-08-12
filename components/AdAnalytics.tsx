'use client';

import { useState, useEffect } from 'react';

interface AnalyticsData {
    impressions: number;
    clicks: number;
    ctr: number;
}

export default function AdAnalytics() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const response = await fetch('/api/analytics');
            const data = await response.json();
            setAnalytics(data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center p-4">加载分析数据中...</div>;
    }

    if (!analytics) {
        return <div className="text-center p-4 text-red-500">无法加载分析数据</div>;
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">广告分析数据</h3>
            <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{analytics.impressions}</div>
                    <div className="text-sm text-gray-500">展示次数</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{analytics.clicks}</div>
                    <div className="text-sm text-gray-500">点击次数</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{analytics.ctr}%</div>
                    <div className="text-sm text-gray-500">点击率</div>
                </div>
            </div>
        </div>
    );
}
