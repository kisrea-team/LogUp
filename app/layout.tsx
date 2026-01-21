/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2026-01-21
 * @FilePath: /LogUp/app/layout.tsx
 * Helllllloo
 */
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme/ThemeContext';
export const metadata: Metadata = {
    title: 'LogUp - 开源项目版本更新日志管理工具',
    description: 'by Kisrea',
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
