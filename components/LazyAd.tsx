'use client';

import { useEffect, useRef, useState } from 'react';
import AdManager, { AdConfig } from '@/lib/adManager';

interface LazyAdProps {
    config: AdConfig;
    adType: string;
    className?: string;
    fallbackContent?: React.ReactNode;
}

declare global {
    interface Window {
        adsbygoogle: any[];
        googletag: any;
    }
}

export default function LazyAd({ config, adType, className = '', fallbackContent }: LazyAdProps) {
    const adRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [adBlocked, setAdBlocked] = useState(false);
    const adManager = AdManager.getInstance();

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isLoaded) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 },
        );

        if (adRef.current) {
            observer.observe(adRef.current);
        }

        return () => observer.disconnect();
    }, [isLoaded]);

    useEffect(() => {
        if (isVisible && !isLoaded) {
            loadAd();
        }
    }, [isVisible, isLoaded]);

    const loadAd = async () => {
        // 检测广告屏蔽
        const isBlocked = await adManager.detectAdBlock();
        if (isBlocked) {
            setAdBlocked(true);
            return;
        }

        // 检查展示频率
        if (!adManager.canShowAd(adType)) {
            return;
        }

        // 加载Google AdSense
        if (!window.adsbygoogle) {
            const script = document.createElement('script');
            script.async = true;
            script.src =
                'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUBLISHER_ID';
            script.crossOrigin = 'anonymous';
            document.head.appendChild(script);

            script.onload = () => {
                window.adsbygoogle = window.adsbygoogle || [];
                initializeAd();
            };
        } else {
            initializeAd();
        }
    };

    const initializeAd = () => {
        if (adRef.current && window.adsbygoogle) {
            try {
                // 推送广告配置
                (window.adsbygoogle = window.adsbygoogle || []).push({});

                // 记录展示
                adManager.recordAdImpression(config.id, adType);
                setIsLoaded(true);

                // 添加点击监听
                const adElement = adRef.current.querySelector('ins');
                if (adElement) {
                    adElement.addEventListener('click', () => {
                        adManager.recordAdClick(config.id, adType);
                    });
                }
            } catch (error) {
                console.error('Ad initialization failed:', error);
                setAdBlocked(true);
            }
        }
    };

    // 广告被屏蔽时的替代内容
    if (adBlocked) {
        return (
            <div
                className={`${className} bg-blue-50 border border-blue-200 rounded-lg p-4 text-center`}
            >
                {fallbackContent || (
                    <div>
                        <p className="text-blue-800 text-sm mb-2">支持我们的网站</p>
                        <p className="text-blue-600 text-xs">
                            请考虑关闭广告屏蔽器以支持我们提供更好的服务
                        </p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div ref={adRef} className={className}>
            {isVisible && (
                <ins
                    className="adsbygoogle"
                    style={{ display: 'block' }}
                    data-ad-client="ca-pub-YOUR_PUBLISHER_ID"
                    data-ad-slot={config.slot}
                    data-ad-format={config.format || 'auto'}
                    data-full-width-responsive={config.responsive ? 'true' : 'false'}
                />
            )}

            {!isVisible && (
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center animate-pulse">
                    <div className="text-gray-400 text-sm">广告加载中...</div>
                </div>
            )}
        </div>
    );
}
