/*
 * @Date: 2025-08-16
 * @LastEditors: vhko
 * @LastEditTime: 2026-01-21
 * @FilePath: /LogUp/next.config.mjs
 * Helllllloo!
 */
import path from 'path';
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'avatars.githubusercontent.com',
                port: '',
                // pathname: '/**',
            },
        ],
    },
    serverExternalPackages: [
        'ssh2',
        'crawlee',
        'puppeteer',
        'puppeteer-core',
        '@crawlee/cheerio',
        'cheerio',
        'browserslist',
        'turndown',
        'mysql2', // Often needed for Prisma/DB clients
    ],
    output: 'standalone',
    async rewrites() {
        const backendPort = process.env.BACKEND_NODE_PORT || '8000';
        const defaultApiBaseUrl = `http://127.0.0.1:${backendPort}`;
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || defaultApiBaseUrl;
        return [
            {
                source: '/api/rsshub/:path*',
                destination: '/rsshub/:path*',
            },
            {
                source: '/api/:path*',
                destination: `${apiBaseUrl}/:path*`,
            },
        ];
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: '*',
                    },
                    {
                        key: 'Access-Control-Allow-Methods',
                        value: 'GET, POST, PUT, DELETE, OPTIONS',
                    },
                    {
                        key: 'Access-Control-Allow-Headers',
                        value: 'Content-Type, Authorization',
                    },
                ],
            },
        ];
    },
};
export default nextConfig;
