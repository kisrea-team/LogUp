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
            <div className="text-center p-4" data-oid="uey63a8">
                加载分析数据中...
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="text-center p-4 text-red-500" data-oid="29zwayp">
                无法加载分析数据
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6" data-oid="2sif3h2">
            <h3 className="text-lg font-semibold mb-4" data-oid="pvz33os">
                广告分析数据
            </h3>
            <div className="grid grid-cols-3 gap-4" data-oid="c6htc55">
                <div className="text-center" data-oid="4g61qci">
                    <div className="text-2xl font-bold text-blue-600" data-oid="81830jd">
                        {analytics.impressions}
                    </div>
                    <div className="text-sm text-gray-500" data-oid="eousd19">
                        展示次数
                    </div>
                </div>
                <div className="text-center" data-oid="rxgpcoc">
                    <div className="text-2xl font-bold text-green-600" data-oid="g3cw5hf">
                        {analytics.clicks}
                    </div>
                    <div className="text-sm text-gray-500" data-oid="fgl2syv">
                        点击次数
                    </div>
                </div>
                <div className="text-center" data-oid="rr84kcb">
                    <div className="text-2xl font-bold text-purple-600" data-oid=":q6h3-p">
                        {analytics.ctr}%
                    </div>
                    <div className="text-sm text-gray-500" data-oid="ha_0l:9">
                        点击率
                    </div>
                </div>
            </div>
        </div>
    );
}
