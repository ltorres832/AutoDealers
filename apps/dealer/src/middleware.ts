import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Regex para detectar sessionIds del panel admin (64 caracteres hex)
const ADMIN_SESSION_RE = /^[a-f0-9]{64}$/i;

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

  // Para todas las demás rutas, verificar que tengan algún tipo de token
  // La verificación real del rol y permisos se hace en las APIs y componentes
  const authToken = request.cookies.get('authToken');
  const authHeader = request.headers.get('authorization');

  // Permitir acceso si hay algún token (cookie, header, o sessionId de admin)
  // Los tokens de admin (sessionIds) serán validados en verifyAuth del dealer app
  const hasToken = authToken || authHeader;

  // Si no hay ningún token y está intentando acceder a una ruta protegida, redirigir a login
  if (!hasToken && !pathname.startsWith('/login')) {
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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};


