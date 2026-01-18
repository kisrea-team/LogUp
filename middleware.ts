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

  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/rsshub/')) {
    const method = request.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD') {
      const excluded = ['/api/projects', '/api/versions', '/api/scrape', '/api/translate'];
      const isExcluded = excluded.some((p) => pathname === p || pathname.startsWith(`${p}/`));
      if (!isExcluded) {
        const url = request.nextUrl.clone();
        url.pathname = `/api/rsshub${pathname.slice('/api'.length)}`;
        return NextResponse.rewrite(url);
      }
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
