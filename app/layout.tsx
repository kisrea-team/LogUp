/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2026-01-24
 * @FilePath: /LogUp/app/layout.tsx
 * Helllllloo
 */
import type { Metadata } from 'next';
import Script from 'next/script';
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
                <noscript>
                    <iframe
                        src="https://www.googletagmanager.com/ns.html?id=GTM-WK5883SZ"
                        height="0"
                        width="0"
                        style={{ display: 'none', visibility: 'hidden' }}
                    />
                </noscript>
                <ThemeProvider>
                    {children}
                </ThemeProvider>
                <Script id="gtm" strategy="afterInteractive">
                    {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WK5883SZ');`}
                </Script>
            </body>
        </html>
    );
}
