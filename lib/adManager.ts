interface AdConfig {
    id: string;
    size: string;
    slot: string;
    format?: string;
    responsive?: boolean;
}

interface AdAnalytics {
    impressions: number;
    clicks: number;
    revenue: number;
    ctr: number;
}

class AdManager {
    private static instance: AdManager;
    private adBlockDetected: boolean = false;
    private adFrequency: Map<string, number> = new Map();
    private analytics: Map<string, AdAnalytics> = new Map();
    private maxAdFrequency: number = 3; // 每小时最多显示3次同类广告

    static getInstance(): AdManager {
        if (!AdManager.instance) {
            AdManager.instance = new AdManager();
        }
        return AdManager.instance;
    }

    // 检测广告屏蔽器
    async detectAdBlock(): Promise<boolean> {
        return new Promise((resolve) => {
            const testAd = document.createElement('div');
            testAd.innerHTML = '&nbsp;';
            testAd.className = 'adsbox';
            testAd.style.position = 'absolute';
            testAd.style.left = '-10000px';
            document.body.appendChild(testAd);

            setTimeout(() => {
                const isBlocked = testAd.offsetHeight === 0;
                document.body.removeChild(testAd);
                this.adBlockDetected = isBlocked;
                resolve(isBlocked);
            }, 100);
        });
    }

    // 检查广告展示频率
    canShowAd(adType: string): boolean {
        const now = Date.now();
        const hourAgo = now - 3600000; // 1小时前
        const key = `${adType}_${Math.floor(now / 3600000)}`;
        const currentCount = this.adFrequency.get(key) || 0;

        return currentCount < this.maxAdFrequency;
    }

    // 记录广告展示
    recordAdImpression(adId: string, adType: string): void {
        const now = Date.now();
        const key = `${adType}_${Math.floor(now / 3600000)}`;
        const currentCount = this.adFrequency.get(key) || 0;
        this.adFrequency.set(key, currentCount + 1);

        // 更新分析数据
        const analytics = this.analytics.get(adId) || {
            impressions: 0,
            clicks: 0,
            revenue: 0,
            ctr: 0,
        };
        analytics.impressions++;
        this.analytics.set(adId, analytics);

        // 发送到分析服务
        this.sendAnalytics('impression', adId, adType);
    }

    // 记录广告点击
    recordAdClick(adId: string, adType: string): void {
        const analytics = this.analytics.get(adId) || {
            impressions: 0,
            clicks: 0,
            revenue: 0,
            ctr: 0,
        };
        analytics.clicks++;
        analytics.ctr = analytics.clicks / analytics.impressions;
        this.analytics.set(adId, analytics);

        // 发送到分析服务
        this.sendAnalytics('click', adId, adType);
    }

    // 发送分析数据
    private async sendAnalytics(event: string, adId: string, adType: string): Promise<void> {
        try {
            await fetch('/api/analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    event,
                    adId,
                    adType,
                    timestamp: Date.now(),
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                }),
            });
        } catch (error) {
            console.error('Failed to send analytics:', error);
        }
    }

    // 获取分析数据
    getAnalytics(adId: string): AdAnalytics | null {
        return this.analytics.get(adId) || null;
    }

    // 是否检测到广告屏蔽
    isAdBlockDetected(): boolean {
        return this.adBlockDetected;
    }
}

export default AdManager;
export type { AdConfig, AdAnalytics };
