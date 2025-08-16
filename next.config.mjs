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
};
export default nextConfig;
