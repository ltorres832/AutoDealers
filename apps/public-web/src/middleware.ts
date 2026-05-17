import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Rutas raíz de la app (no bajo /[tenant]/). Sin esto, `tenant.dominio/register` → 404. */
function isPlatformRootPath(pathname: string): boolean {
  if (pathname.startsWith('/register')) return true;
  if (pathname.startsWith('/registro')) return true;
  if (pathname.startsWith('/login')) return true;
  if (pathname.startsWith('/search')) return true;
  if (pathname.startsWith('/compare')) return true;
  if (pathname.startsWith('/dealers')) return true;
  if (pathname.startsWith('/dealer/')) return true;
  if (pathname.startsWith('/seller/')) return true;
  if (pathname.startsWith('/contacto')) return true;
  if (pathname.startsWith('/faq')) return true;
  if (pathname.startsWith('/terminos')) return true;
  if (pathname.startsWith('/privacidad')) return true;
  if (pathname.startsWith('/precios')) return true;
  if (pathname.startsWith('/caracteristicas')) return true;
  if (pathname.startsWith('/sobre-nosotros')) return true;
  if (pathname.startsWith('/advertise')) return true;
  if (pathname.startsWith('/ads-preview')) return true;
  if (pathname.startsWith('/publicar-gratis')) return true;
  if (pathname.startsWith('/anuncio/')) return true;
  if (pathname.startsWith('/setup-firebase')) return true;
  if (pathname.startsWith('/category/')) return true;
  if (pathname.startsWith('/contracts/')) return true;
  if (pathname.startsWith('/fi/')) return true;
  if (pathname.startsWith('/upload-documents/')) return true;
  if (pathname.startsWith('/review/')) return true;
  if (pathname.startsWith('/survey/')) return true;
  if (pathname.startsWith('/policies')) return true;
  if (pathname.startsWith('/dashboard/')) return true;
  if (pathname.startsWith('/partners/')) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Evitar que el comodín de matcher o enlaces rotos dejen el primer segmento como "*"
  const firstSeg = pathname.split('/').filter(Boolean)[0];
  if (firstSeg === '*' || firstSeg === '%2A' || firstSeg === '%2a') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Ignorar archivos estáticos y rutas de Next.js (incl. /brand para que no se reescriba como ruta de tenant)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/brand') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.') // Archivos con extensión (imágenes, CSS, JS, etc.)
  ) {
    return NextResponse.next();
  }

  const hostname = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const parts = hostname.split('.');

  console.log('🛡️ Middleware check:', { hostname, pathname });

  // IGNORAR agresivamente dominios técnicos (App Hosting, Firebase, etc.)
  const isTechnicalDomain = 
    hostname.includes('---') || 
    hostname.includes('public-web-app--') ||
    hostname.includes('us-central1.hosted.app') ||
    hostname.includes('amplifyapp') ||
    (hostname.includes('web.app') && !hostname.startsWith('autodealers-7f62e')) ||
    (hostname.includes('firebaseapp.com') && !hostname.startsWith('autodealers-7f62e'));

  if (isTechnicalDomain) {
    console.log('⏩ Skipping technical domain:', hostname);
    return NextResponse.next();
  }

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

      // IGNORAR subdominios de Firebase App Hosting (suelen contener '---')
      if (firstPart.includes('---')) {
        return NextResponse.next();
      }

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
    if (isPlatformRootPath(pathname)) {
      return NextResponse.next();
    }

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
    '/((?!api|_next/static|_next/image|favicon.ico|brand).*)',
  ],
};

