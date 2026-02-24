/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2026-01-24
 * @FilePath: /LogUp/app/layout.tsx
 * Helllllloo
 */
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme/ThemeContext';
export const metadata: Metadata = {
    title: {
        default: 'LogUp - 开源项目版本更新日志',
        template: '%s | LogUp',
    },
    description: '追踪和浏览 GitHub 热门开源项目的版本更新日志，第一时间了解更新内容',
    keywords: ['开源', '更新日志', 'changelog', 'release notes', 'GitHub', '版本更新', '热门项目'],
    openGraph: {
        type: 'website',
        siteName: 'LogUp',
        title: 'LogUp - 开源项目版本更新日志',
        description: '追踪和浏览 GitHub 热门开源项目的版本更新日志，第一时间了解更新内容',
    },
    twitter: {
        card: 'summary_large_image',
    },
    robots: {
        index: true,
        follow: true,
    },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html className='dark'>
            <body>
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
