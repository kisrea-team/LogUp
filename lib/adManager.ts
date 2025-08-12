import type { AdConfig, AdAnalytics, AnalyticsData } from '@/types';

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
        return new Promise<boolean>((resolve, reject) => {
            try {
                const testAd = document.createElement('div');
                testAd.innerHTML = '&nbsp;';
                testAd.className = 'adsbox';
                testAd.style.position = 'absolute';
                testAd.style.left = '-10000px';
                testAd.style.visibility = 'hidden';
                document.body.appendChild(testAd);

                setTimeout(() => {
                    try {
                        const isBlocked = testAd.offsetHeight === 0;
                        if (document.body.contains(testAd)) {
                            document.body.removeChild(testAd);
                        }
                        this.adBlockDetected = isBlocked;
                        resolve(isBlocked);
                    } catch (cleanupError) {
                        console.warn('Error during ad block detection cleanup:', cleanupError);
                        resolve(false);
                    }
                }, 100);
            } catch (error) {
                console.error('Error during ad block detection:', error);
                reject(error);
            }
        });
    }

    // 检查广告展示频率
    canShowAd(adType: string): boolean {
        if (!adType || typeof adType !== 'string') {
            console.warn('Invalid adType provided to canShowAd:', adType);
            return false;
        }

        const now = Date.now();
        const key = `${adType}_${Math.floor(now / 3600000)}`;
        const currentCount = this.adFrequency.get(key) || 0;

        return currentCount < this.maxAdFrequency;
    }

    // 记录广告展示
    recordAdImpression(adId: string, adType: string): void {
        if (!adId || !adType) {
            console.warn('Invalid parameters for recordAdImpression:', { adId, adType });
            return;
        }

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
        analytics.ctr =
            analytics.impressions > 0 ? (analytics.clicks / analytics.impressions) * 100 : 0;
        this.analytics.set(adId, analytics);

        // 发送到分析服务
        this.sendAnalytics('impression', adId, adType).catch((error) => {
            console.error('Failed to send impression analytics:', error);
        });
    }

    // 记录广告点击
    recordAdClick(adId: string, adType: string): void {
        if (!adId || !adType) {
            console.warn('Invalid parameters for recordAdClick:', { adId, adType });
            return;
        }

        const analytics = this.analytics.get(adId) || {
            impressions: 0,
            clicks: 0,
            revenue: 0,
            ctr: 0,
        };
        analytics.clicks++;
        analytics.ctr =
            analytics.impressions > 0 ? (analytics.clicks / analytics.impressions) * 100 : 0;
        this.analytics.set(adId, analytics);

        // 发送到分析服务
        this.sendAnalytics('click', adId, adType).catch((error) => {
            console.error('Failed to send click analytics:', error);
        });
    }

    // 发送分析数据
    private async sendAnalytics(
        event: AnalyticsData['event'],
        adId: string,
        adType: string,
    ): Promise<void> {
        try {
            const analyticsData: AnalyticsData = {
                event,
                adId,
                adType,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                referrer: document.referrer,
                screenResolution: `${screen.width}x${screen.height}`,
                viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            };

            const response = await fetch('/api/analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(analyticsData),
            });

            if (!response.ok) {
                throw new Error(`Analytics API error: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Failed to send analytics:', error);
            // 可以考虑将失败的分析数据存储到本地存储中，稍后重试
        }
    }

    // 获取分析数据
    getAnalytics(adId: string): AdAnalytics | null {
        if (!adId) {
            console.warn('Invalid adId provided to getAnalytics:', adId);
            return null;
        }
        return this.analytics.get(adId) || null;
    }

    // 获取所有分析数据
    getAllAnalytics(): Map<string, AdAnalytics> {
        return new Map(this.analytics);
    }

    // 是否检测到广告屏蔽
    isAdBlockDetected(): boolean {
        return this.adBlockDetected;
    }

    // 设置广告频率限制
    setAdFrequencyLimit(limit: number): void {
        if (limit > 0 && Number.isInteger(limit)) {
            this.maxAdFrequency = limit;
        } else {
            console.warn('Invalid frequency limit:', limit);
        }
    }

    // 获取广告频率限制
    getAdFrequencyLimit(): number {
        return this.maxAdFrequency;
    }

    // 清理过期的频率数据
    cleanupExpiredFrequencyData(): void {
        const now = Date.now();
        const hourAgo = now - 3600000;

        for (const [key] of this.adFrequency) {
            const keyParts = key.split('_');
            if (keyParts.length >= 2) {
                const keyTime = parseInt(keyParts[keyParts.length - 1]) * 3600000;
                if (keyTime < hourAgo) {
                    this.adFrequency.delete(key);
                }
            }
        }
    }

    // 重置所有数据（用于测试或重新初始化）
    reset(): void {
        this.adBlockDetected = false;
        this.adFrequency.clear();
        this.analytics.clear();
    }
}

export default AdManager;
export type { AdConfig, AdAnalytics };
