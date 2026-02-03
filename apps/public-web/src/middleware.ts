import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorar archivos estáticos y rutas de Next.js
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Archivos con extensión (imágenes, CSS, JS, etc.)
  ) {
    return NextResponse.next();
  }

  const hostname = request.headers.get('host') || '';
  const parts = hostname.split('.');
  
  // Dominios base de Firebase (NO tienen subdominio)
  const firebaseBaseDomains = [
    'autodealers-7f62e.web.app',
    'autodealers-7f62e.firebaseapp.com',
    'localhost',
  ];
  
  // Si es el dominio base de Firebase, NO buscar subdominio
  if (firebaseBaseDomains.includes(hostname) || firebaseBaseDomains.some(base => hostname.startsWith(base + ':'))) {
    return NextResponse.next();
  }
  
  // Detectar subdominio
  let subdomain: string | null = null;
  
  // En localhost: subdomain.localhost:3000
  if (hostname.includes('localhost')) {
    const localhostParts = hostname.split(':');
    if (localhostParts[0] !== 'localhost' && localhostParts[0] !== 'www') {
      subdomain = localhostParts[0];
    }
  } else {
    // En producción: subdomain.autodealers.com o subdomain.web.app
    // Solo considerar subdominio si hay más de 2 partes Y la primera no es el dominio base
    if (parts.length >= 3) {
      const firstPart = parts[0];
      const lastParts = parts.slice(-2).join('.');
      
      // Si termina con .web.app o .firebaseapp.com, la primera parte podría ser un subdominio
      // PERO si es autodealers-7f62e.web.app, NO es un subdominio
      if (lastParts === 'web.app' || lastParts === 'firebaseapp.com') {
        // Si la primera parte NO es el ID del proyecto Firebase, entonces es un subdominio
        if (firstPart !== 'autodealers-7f62e' && firstPart !== 'www') {
          subdomain = firstPart;
        }
      } else {
        // Para dominios normales (ej: subdomain.autodealers.com)
        // Verificar que la primera parte no sea parte del dominio base
        if (firstPart !== 'www' && firstPart !== 'autodealers') {
          subdomain = firstPart;
        }
      }
    }
  }

  // Si hay subdominio y no es 'www' ni 'admin' ni 'app' ni 'seller' ni 'advertiser', redirigir a la página del tenant
  if (subdomain && subdomain !== 'www' && subdomain !== 'admin' && subdomain !== 'app' && subdomain !== 'seller' && subdomain !== 'advertiser') {
    const url = request.nextUrl.clone();
    
    // Si ya está en la ruta del subdominio, no hacer nada
    if (!url.pathname.startsWith(`/${subdomain}`)) {
      url.pathname = `/${subdomain}${url.pathname === '/' ? '' : url.pathname}`;
      return NextResponse.rewrite(url);
    }
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

