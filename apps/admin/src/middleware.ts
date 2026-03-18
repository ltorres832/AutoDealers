import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Handle root path requests that might be API requests
  if (pathname === '/') {
    const acceptHeader = request.headers.get('accept') || '';
    const userAgent = request.headers.get('user-agent') || '';
    
    // Check if this looks like an API request or backend health check
    // Only return JSON if explicitly requesting JSON AND not HTML
    const wantsJson = acceptHeader.includes('application/json');
    const wantsHtml = acceptHeader.includes('text/html');
    const isApiClient = userAgent.includes('Google-Cloud-Functions') || 
                       userAgent.includes('Firebase') ||
                       userAgent.includes('curl') ||
                       userAgent.includes('Postman') ||
                       userAgent.includes('httpie');
    
    // Return JSON only for explicit API requests, not browser requests
    if (wantsJson && !wantsHtml || isApiClient) {
      // Return JSON response for API/backend requests
      return NextResponse.json({
        service: 'AutoDealers Admin Panel API',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'AutoDealers Admin Panel API Backend is running',
        endpoints: {
          api: '/api',
          health: '/api/health',
          dashboard: '/api/dashboard',
          leads: '/api/leads',
          vehicles: '/api/vehicles',
        },
      });
    }
    // For browser requests, let Next.js handle the redirect
  }
  
  // For all other requests, continue normally
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
