import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminPageAuthenticated } from './lib/auth';

// Next.js 16 proxy（原 middleware 约定已弃用）
// 保护 /admin/* 页面：验证 HMAC 签名的会话 cookie，未登录跳转 /admin/login
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedPath = pathname.startsWith('/admin') && pathname !== '/admin/login';

  if (isProtectedPath) {
    const cookieHeader = request.headers.get('cookie');
    if (!isAdminPageAuthenticated(cookieHeader)) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
