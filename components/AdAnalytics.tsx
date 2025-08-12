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
        return (
            <div className="text-center p-4" data-oid="fpfjt7s">
                加载分析数据中...
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="text-center p-4 text-red-500" data-oid="8uc31s5">
                无法加载分析数据
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6" data-oid="hlwx3--">
            <h3 className="text-lg font-semibold mb-4" data-oid="-rx48xc">
                广告分析数据
            </h3>
            <div className="grid grid-cols-3 gap-4" data-oid="mt92h-5">
                <div className="text-center" data-oid="kkbaljk">
                    <div className="text-2xl font-bold text-blue-600" data-oid="4h813pl">
                        {analytics.impressions}
                    </div>
                    <div className="text-sm text-gray-500" data-oid="x1zajxl">
                        展示次数
                    </div>
                </div>
                <div className="text-center" data-oid="d-1ae9v">
                    <div className="text-2xl font-bold text-green-600" data-oid="hyt.hrv">
                        {analytics.clicks}
                    </div>
                    <div className="text-sm text-gray-500" data-oid="toa5qmr">
                        点击次数
                    </div>
                </div>
                <div className="text-center" data-oid="qjwopoq">
                    <div className="text-2xl font-bold text-purple-600" data-oid="3iud2wx">
                        {analytics.ctr}%
                    </div>
                    <div className="text-sm text-gray-500" data-oid=":2q0vn6">
                        点击率
                    </div>
                </div>
            </div>
        </div>
    );
}
