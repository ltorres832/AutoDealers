import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/join-dealer') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/internal-chat') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const authToken = request.cookies.get('authToken');

  if (!authToken && !pathname.startsWith('/login')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
