import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================================
// Next.js Middleware — Auth protection for dashboard routes
// Runs on every matched request before the route handler
// ============================================================

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('webmonitor_token')?.value;

  // Protect dashboard routes: redirect to login if no token
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users away from auth pages
  if ((pathname === '/login' || pathname === '/signup') && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/signup',
  ],
};
