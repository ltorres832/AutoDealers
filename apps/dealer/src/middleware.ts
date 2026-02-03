import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir acceso a rutas públicas sin autenticación
  // También permitir rutas del chat interno (el polling puede causar 401 temporales)
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/api/internal-chat') || // Chat interno - no redirigir en 401
    pathname.includes('.') // Archivos estáticos
  ) {
    return NextResponse.next();
  }

  // Para todas las demás rutas, verificar que tengan el token
  // La verificación real del rol se hace en las APIs y componentes
  const authToken = request.cookies.get('authToken');

  // Si no hay token y está intentando acceder a una ruta protegida, redirigir a login
  if (!authToken && !pathname.startsWith('/login')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};


