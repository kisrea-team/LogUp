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
            },
            {
                protocol: 'https',
                hostname: 'user-images.githubusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'raw.githubusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'camo.githubusercontent.com',
            },
            {
                protocol: 'https',
                hostname: '**.githubusercontent.com',
            },
            {
                protocol: 'https',
                hostname: '**.githubassets.com',
            },
        ],
    },
    serverExternalPackages: [],
    output: 'standalone',
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
