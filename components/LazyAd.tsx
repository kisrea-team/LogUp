'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import AdManager from '@/lib/adManager';
import type { AdConfig } from '@/types';

interface LazyAdProps {
    config: AdConfig;
    adType: string;
    className?: string;
    fallbackContent?: React.ReactNode;
    onAdLoad?: () => void;
    onAdError?: (error: Error) => void;
}

// 扩展Window类型以包含AdSense相关属性
declare global {
    interface Window {
        adsbygoogle: unknown[];
        googletag: unknown;
    }
}

// 广告加载状态枚举
enum AdLoadState {
    IDLE = 'idle',
    LOADING = 'loading',
    LOADED = 'loaded',
    BLOCKED = 'blocked',
    ERROR = 'error',
}

export default function LazyAd({
    config,
    adType,
    className = '',
    fallbackContent,
    onAdLoad,
    onAdError,
}: LazyAdProps) {
    const adRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [loadState, setLoadState] = useState<AdLoadState>(AdLoadState.IDLE);
    const adManager = AdManager.getInstance();

    // 验证配置
    const isValidConfig = useCallback((): boolean => {
        if (!config || !config.id || !config.slot) {
            console.error('Invalid ad config:', config);
            return false;
        }
        if (!adType || typeof adType !== 'string') {
            console.error('Invalid adType:', adType);
            return false;
        }
        return true;
    }, [config, adType]);

    // 设置Intersection Observer
    useEffect(() => {
        if (!isValidConfig() || loadState !== AdLoadState.IDLE) {
            return;
        }

        observerRef.current = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && loadState === AdLoadState.IDLE) {
                    setIsVisible(true);
                }
            },
            {
                threshold: 0.1,
                rootMargin: '50px',
            },
        );

        if (adRef.current) {
            observerRef.current.observe(adRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [isValidConfig, loadState]);

    // 加载广告
    const loadAd = useCallback(async (): Promise<void> => {
        if (!isValidConfig() || loadState !== AdLoadState.IDLE) {
            return;
        }

        try {
            setLoadState(AdLoadState.LOADING);

            // 检测广告屏蔽
            const isBlocked = await adManager.detectAdBlock();
            if (isBlocked) {
                setLoadState(AdLoadState.BLOCKED);
                return;
            }

            // 检查展示频率
            if (!adManager.canShowAd(adType)) {
                console.info(`Ad frequency limit reached for type: ${adType}`);
                setLoadState(AdLoadState.BLOCKED);
                return;
            }

            // 加载Google AdSense
            await loadAdSenseScript();
            initializeAd();
        } catch (error) {
            const adError = error instanceof Error ? error : new Error('Unknown ad loading error');
            console.error('Ad loading failed:', adError);
            setLoadState(AdLoadState.ERROR);
            onAdError?.(adError);
        }
    }, [isValidConfig, loadState, adManager, adType, onAdError]);

    // 加载AdSense脚本
    const loadAdSenseScript = useCallback((): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (window.adsbygoogle) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.async = true;
            script.src =
                'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUBLISHER_ID';
            script.crossOrigin = 'anonymous';

            script.onload = () => {
                window.adsbygoogle = window.adsbygoogle || [];
                resolve();
            };

            script.onerror = () => {
                reject(new Error('Failed to load AdSense script'));
            };

            document.head.appendChild(script);
        });
    }, []);

    // 初始化广告
    const initializeAd = useCallback((): void => {
        if (!adRef.current || !window.adsbygoogle) {
            throw new Error('Ad initialization failed: missing elements');
        }

        try {
            // 推送广告配置
            (window.adsbygoogle as unknown[]).push({});

            // 记录展示
            adManager.recordAdImpression(config.id, adType);
            setLoadState(AdLoadState.LOADED);
            onAdLoad?.();

            // 添加点击监听
            const adElement = adRef.current.querySelector('ins');
            if (adElement) {
                const handleClick = () => {
                    adManager.recordAdClick(config.id, adType);
                };
                adElement.addEventListener('click', handleClick);

                // 清理函数
                return () => {
                    adElement.removeEventListener('click', handleClick);
                };
            }
        } catch (error) {
            throw new Error(
                `Ad initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }, [adManager, config.id, adType, onAdLoad]);

    // 当广告变为可见时加载
    useEffect(() => {
        if (isVisible && loadState === AdLoadState.IDLE) {
            loadAd();
        }
    }, [isVisible, loadState, loadAd]);

    // 渲染广告被屏蔽时的替代内容
    if (loadState === AdLoadState.BLOCKED) {
        return (
            <div
                className={`${className} bg-blue-50 border border-blue-200 rounded-lg p-4 text-center`}
                data-oid="2y73y-a"
            >
                {fallbackContent || (
                    <div data-oid="5g28__h">
                        <p className="text-blue-800 text-sm mb-2" data-oid="nso_24c">
                            支持我们的网站
                        </p>
                        <p className="text-blue-600 text-xs" data-oid="yjprai3">
                            请考虑关闭广告屏蔽器以支持我们提供更好的服务
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // 渲染错误状态
    if (loadState === AdLoadState.ERROR) {
        return (
            <div
                className={`${className} bg-red-50 border border-red-200 rounded-lg p-4 text-center`}
                data-oid="4xrwe:q"
            >
                <p className="text-red-800 text-sm" data-oid="8fx.g02">
                    广告加载失败
                </p>
            </div>
        );
    }

    return (
        <div ref={adRef} className={className} data-oid="3compc0">
            {isVisible && loadState === AdLoadState.LOADED && (
                <ins
                    className="adsbygoogle"
                    style={{ display: 'block' }}
                    data-ad-client="ca-pub-YOUR_PUBLISHER_ID"
                    data-ad-slot={config.slot}
                    data-ad-format={config.format || 'auto'}
                    data-full-width-responsive={config.responsive ? 'true' : 'false'}
                    data-oid=".jqyl:l"
                />
            )}

            {(loadState === AdLoadState.IDLE || loadState === AdLoadState.LOADING) && (
                <div
                    className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center animate-pulse"
                    data-oid="01-jd.g"
                >
                    <div className="text-gray-400 text-sm" data-oid="lu3143x">
                        {loadState === AdLoadState.LOADING ? '广告加载中...' : '准备加载广告...'}
                    </div>
                </div>
            )}
        </div>
    );
}
