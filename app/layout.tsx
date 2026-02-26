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
        default: 'LogUp - 捕捉技术演进的每一个瞬间',
        template: '%s | LogUp',
    },
    description: '追踪各类软件、App 与开源项目的版本更新动态，包括 GitHub 热门项目、iOS/Android App、桌面软件及 SaaS 工具',
    keywords: ['更新日志', 'changelog', 'release notes', '版本更新', '开源项目', 'GitHub', 'App', '桌面软件', 'SaaS', '软件追踪'],
    openGraph: {
        type: 'website',
        siteName: 'LogUp',
        title: 'LogUp - 软件版本更新日志',
        description: '追踪各类软件、App 与开源项目的版本更新动态，包括 GitHub 热门项目、iOS/Android App、桌面软件及 SaaS 工具',
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
                <Script async src="https://www.googletagmanager.com/gtag/js?id=G-VTEXRW9NFM" strategy="afterInteractive" />
                <Script id="gtag" strategy="afterInteractive">
                    {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-VTEXRW9NFM');`}
                </Script>
            </body>
        </html>
    );
}
