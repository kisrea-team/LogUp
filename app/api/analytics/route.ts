import { NextRequest, NextResponse } from 'next/server';

interface AnalyticsData {
    event: string;
    adId: string;
    adType: string;
    timestamp: number;
    userAgent: string;
    url: string;
}

// 在实际应用中，这些数据应该存储到数据库
const analyticsStore: AnalyticsData[] = [];

export async function POST(request: NextRequest) {
    try {
        const data: AnalyticsData = await request.json();

        // 验证数据
        if (!data.event || !data.adId || !data.adType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 存储分析数据
        analyticsStore.push({
            ...data,
            timestamp: Date.now(),
        });

        // 在实际应用中，这里应该将数据存储到数据库
        // 例如：await saveToDatabase(data);

        console.log(`Ad ${data.event}: ${data.adId} (${data.adType})`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const adId = searchParams.get('adId');
    const adType = searchParams.get('adType');

    let filteredData = analyticsStore;

    if (adId) {
        filteredData = filteredData.filter((item) => item.adId === adId);
    }

    if (adType) {
        filteredData = filteredData.filter((item) => item.adType === adType);
    }

    // 计算统计数据
    const impressions = filteredData.filter((item) => item.event === 'impression').length;
    const clicks = filteredData.filter((item) => item.event === 'click').length;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    return NextResponse.json({
        impressions,
        clicks,
        ctr: parseFloat(ctr.toFixed(2)),
        data: filteredData,
    });
}
