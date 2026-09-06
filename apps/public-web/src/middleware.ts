import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  isPlatformAppSubdomain,
} from '@/lib/default-root-seller-website';
import { shouldRedirectApexToWww, wwwHostname } from '@/lib/public-seo';

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
  if (pathname.startsWith('/home-seller/')) return true;
  if (pathname.startsWith('/contacto')) return true;
  if (pathname.startsWith('/faq')) return true;
  if (pathname.startsWith('/terminos')) return true;
  if (pathname.startsWith('/privacidad')) return true;
  if (pathname.startsWith('/precios')) return true;
  if (pathname.startsWith('/caracteristicas')) return true;
  if (pathname.startsWith('/plataforma')) return true;
  if (pathname.startsWith('/demo-vendedor')) return true;
  if (pathname.startsWith('/demo-dealer')) return true;
  if (pathname.startsWith('/promo/')) return true;
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
  if (pathname.startsWith('/dashboard/')) return true;
  if (pathname.startsWith('/partners/')) return true;
  if (pathname.startsWith('/affiliate')) return true;
  if (pathname.startsWith('/sales')) return true;
  if (pathname.startsWith('/servicios')) return true;
  if (pathname.startsWith('/registro/negocio')) return true;
  if (pathname.startsWith('/mi-garage')) return true;
  if (pathname.startsWith('/mi-garage/crear-cuenta')) return true;
  if (pathname.startsWith('/pay/')) return true;
  if (pathname.startsWith('/docs/')) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';

  if (shouldRedirectApexToWww(hostname)) {
    const url = request.nextUrl.clone();
    url.hostname = wwwHostname();
    return NextResponse.redirect(url, 301);
  }

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

  // Portal de ventas: exigir cookie antes de servir HTML (cualquier host de public-web)
  if (
    pathname.startsWith('/sales') &&
    !pathname.startsWith('/sales/login') &&
    pathname !== '/sales'
  ) {
    const salesToken = request.cookies.get('salesEmployeeAuthToken');
    if (!salesToken?.value) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/sales/login';
      loginUrl.search = '';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

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

  // Mientras App Hosting no enrute business.* al backend business-app (el wildcard de
  // public-web gana), mandar el host del panel al URL hosted.app para no servir el homepage negro.
  const hostNoPort = hostname.split(':')[0]?.toLowerCase() || '';
  if (hostNoPort === 'business.autodealers-online.com') {
    const dest = new URL(
      `${pathname}${request.nextUrl.search}`,
      'https://business-app--autodealers-7f62e.us-central1.hosted.app'
    );
    return NextResponse.redirect(dest, 307);
  }

  const publicRootHosts = [
    'www.autodealers-online.com',
    'autodealers-online.com',
    'localhost',
  ];

  if (publicRootHosts.includes(hostname) || publicRootHosts.some((base) => hostname.startsWith(base + ':'))) {
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
        // Para dominios normales (ej: tenant.autodealers-online.com)
        if (firstPart !== 'www' && firstPart !== 'autodealers' && firstPart !== 'autodealers-online' && !isPlatformAppSubdomain(firstPart)) {
          subdomain = firstPart;
        }
      }
    }
  }

  // Si hay subdominio de tenant (no panel reservado), reescribir a /[subdomain]
  if (subdomain && !isPlatformAppSubdomain(subdomain)) {
    if (isPlatformRootPath(pathname)) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    const pathParts = pathname.split('/').filter(Boolean);

    // Compatibilidad con enlaces viejos generados como /{tenantId}/vehicle/{id}
    // dentro de un host de subdominio: pedroortiz.../{tenantId}/vehicle/{id}.
    if (pathParts.length >= 3 && pathParts[1] === 'vehicle') {
      url.pathname = `/vehicle/${pathParts.slice(2).join('/')}`;
      return NextResponse.redirect(url);
    }

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

