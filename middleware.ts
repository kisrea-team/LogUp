import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of paths that require authentication
const protectedPaths = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedPath = protectedPaths.some(path =>
    pathname.startsWith(path) && pathname !== '/admin/login'
  );

  if (isProtectedPath) {
    const adminLoggedIn = request.cookies.get('adminLoggedIn')?.value === 'true';

    if (!adminLoggedIn) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

