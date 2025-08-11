import { AdConfig } from './adManager';

export const adConfigs: Record<string, AdConfig> = {
    topBanner: {
        id: 'top-banner-ad',
        size: '728x90',
        slot: '1234567890', // 替换为真实的AdSense广告位ID
        format: 'horizontal',
        responsive: true,
    },
    sidebarSquare: {
        id: 'sidebar-square-ad',
        size: '300x250',
        slot: '1234567891',
        format: 'rectangle',
        responsive: false,
    },
    sidebarSkyscraper: {
        id: 'sidebar-skyscraper-ad',
        size: '160x600',
        slot: '1234567892',
        format: 'vertical',
        responsive: false,
    },
    contentAd: {
        id: 'content-ad',
        size: '728x250',
        slot: '1234567893',
        format: 'horizontal',
        responsive: true,
    },
    mobileFloating: {
        id: 'mobile-floating-ad',
        size: '320x50',
        slot: '1234567894',
        format: 'horizontal',
        responsive: true,
    },
    detailPageTop: {
        id: 'detail-top-ad',
        size: '728x90',
        slot: '1234567895',
        format: 'horizontal',
        responsive: true,
    },
    detailPageBottom: {
        id: 'detail-bottom-ad',
        size: '728x250',
        slot: '1234567896',
        format: 'horizontal',
        responsive: true,
    },
};
