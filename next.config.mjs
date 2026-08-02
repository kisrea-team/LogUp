/**
 * @type {import('next').NextConfig}
 *
 * 说明：
 * - 前后端同源（Next.js route handlers 直连 Prisma / GitHub API），无需全局 CORS。
 * - 全局 `Access-Control-Allow-Origin: *` 已移除（旧的分裂后端架构遗留）。
 */
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
                // 基础安全响应头（不含跨域许可）
                source: '/:path*',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()',
                    },
                ],
            },
        ];
    },
};
export default nextConfig;
