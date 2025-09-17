/*
 * @Date: 2025-08-26
 * @LastEditors: vhko
 * @LastEditTime: 2025-09-17
 * @FilePath: /LogUp/components/utils/classify.tsx
 * Helllllloo!
 */
import { LayoutDashboard,AppWindowMac,Newspaper,Code,Smartphone,Bot } from 'lucide-react';
export const classify = [
    { key: 'app', label: '软件', icon: LayoutDashboard },
    { key: 'web', label: '网站', icon: AppWindowMac },
    { key: 'news', label: '资讯', icon: Newspaper },
    { key: 'language', label: '语言', icon: Code },
    { key: 'mobile', label: '设备', icon: Smartphone },
    { key: 'ai', label: 'Ai', icon: Bot },
];
