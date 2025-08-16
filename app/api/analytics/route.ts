import { NextRequest, NextResponse } from 'next/server';

interface AnalyticsData {
    event: string;
    adId: string;
    adType: string;
    timestamp: number;
    userAgent: string;
    url: string;
    referrer?: string;
    screenResolution?: string;
    viewportSize?: string;
}

// In a real application, this data should be stored in a database
const analyticsStore: AnalyticsData[] = [];

export async function POST(request: NextRequest) {
    try {
        const data: AnalyticsData = await request.json();
        
        // Validate data
        if (!data.event || !data.adId || !data.adType) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }
        
        // Store analytics data
        analyticsStore.push({
            ...data,
            timestamp: Date.now(),
        });
        
        // In a real application, data should be stored in a database
        // For example: await saveToDatabase(data);
        
        console.log(`Ad ${data.event}: ${data.adId} (${data.adType})`);
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const adId = searchParams.get('adId');
    const adType = searchParams.get('adType');
    const timeRange = searchParams.get('timeRange') || '24h';
    
    let filteredData = analyticsStore;
    
    // Filter by time range
    const now = Date.now();
    let timeThreshold = now;
    
    switch (timeRange) {
        case '24h':
            timeThreshold = now - 24 * 60 * 60 * 1000;
            break;
        case '7d':
            timeThreshold = now - 7 * 24 * 60 * 60 * 1000;
            break;
        case '30d':
            timeThreshold = now - 30 * 24 * 60 * 60 * 1000;
            break;
    }
    
    filteredData = filteredData.filter((item) => item.timestamp >= timeThreshold);
    
    if (adId) {
        filteredData = filteredData.filter((item) => item.adId === adId);
    }
    
    if (adType) {
        filteredData = filteredData.filter((item) => item.adType === adType);
    }
    
    // Calculate statistics
    const impressions = filteredData.filter((item) => item.event === 'impression').length;
    const clicks = filteredData.filter((item) => item.event === 'click').length;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    
    // Generate mock ad performance data for the table
    const adIds = Array.from(new Set(filteredData.map((item) => item.adId)));
    const adPerformance = adIds.map((adId) => {
        const adData = filteredData.filter((item) => item.adId === adId);
        const adImpressions = adData.filter((item) => item.event === 'impression').length;
        const adClicks = adData.filter((item) => item.event === 'click').length;
        const adCtr = adImpressions > 0 ? (adClicks / adImpressions) * 100 : 0;
        const adRevenue = adClicks * 0.01; // Mock revenue calculation
        
        return {
            adId,
            adType: adData[0]?.adType || 'banner',
            impressions: adImpressions,
            clicks: adClicks,
            ctr: parseFloat(adCtr.toFixed(2)),
            revenue: parseFloat(adRevenue.toFixed(2)),
        };
    });
    
    return NextResponse.json({
        impressions,
        clicks,
        ctr: parseFloat(ctr.toFixed(2)),
        data: filteredData,
        adPerformance,
    });
}