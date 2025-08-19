/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2025-08-19
 * @FilePath: /LogUp/next.config.mjs
 * Helllllloo!
 */
import path from 'path';
/** @type {import('next').NextConfig} */
const nextConfig = {
    
    output: 'standalone',
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://logup-back.zeabur.app'}/:path*`,
            },
        ];
    },
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "Access-Control-Allow-Origin",
                        value: "*",
                    },
                    {
                        key: "Access-Control-Allow-Methods",
                        value: "GET, POST, PUT, DELETE, OPTIONS",
                    },
                    {
                        key: "Access-Control-Allow-Headers",
                        value: "Content-Type, Authorization",
                    },
                ],
            },
        ];
    },
};
export default nextConfig;
