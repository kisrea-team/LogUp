import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of paths that require authentication
const protectedPaths = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the path requires authentication
  const isProtectedPath = protectedPaths.some(path => 
    pathname.startsWith(path) && pathname !== '/admin/login'
  );
  
  if (isProtectedPath) {
    // Check for admin login status
    const adminLoggedIn = request.cookies.get('adminLoggedIn')?.value === 'true';
    
    if (!adminLoggedIn) {
      // Redirect to login page
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: ['/admin/:path*'],
};