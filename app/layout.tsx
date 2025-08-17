/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2025-08-17
 * @FilePath: /LogUp/app/layout.tsx
 * Helllllloo!
 */
import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
    title: 'LogUp - 开源项目版本更新日志管理工具',
    description: 'by Kisrea',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body className="">
                {children}
            </body>
        </html>
    );
}
