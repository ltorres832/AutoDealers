'use client';

import Link from 'next/link';
import { PublicSiteNavbarBrand } from './PublicSiteNavbarBrand';

const linkClass =
  'text-sm font-medium text-gray-700 transition hover:text-primary-600';

type PublicMarketingNavProps = {
  backHref?: string;
  backLabel?: string;
  showDefaultLinks?: boolean;
  /** Navbar fijo (home) vs sticky (páginas internas) */
  fixed?: boolean;
  scrolled?: boolean;
};

export function PublicMarketingNav({
  backHref,
  backLabel = '← Volver',
  showDefaultLinks = false,
  fixed = false,
  scrolled = false,
}: PublicMarketingNavProps) {
  return (
    <nav
      className={`${fixed ? 'fixed top-0 w-full' : 'sticky top-0'} z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-gray-200 bg-white shadow-md'
          : 'border-gray-100 bg-white/98 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {backHref ? (
              <Link href={backHref} className={`shrink-0 ${linkClass}`}>
                {backLabel}
              </Link>
            ) : null}
            <PublicSiteNavbarBrand
              href="/"
              nameClassName="text-xl font-bold text-brand-black tracking-tight"
              taglineClassName="text-xs font-normal text-gray-500"
            />
          </div>

          <div className="hidden items-center gap-6 md:flex">
            {showDefaultLinks ? (
              <>
                <Link href="/#vehicles" className={linkClass}>
                  Vehículos
                </Link>
                <Link href="/dealers" className={linkClass}>
                  Concesionarios
                </Link>
                <Link href="/advertise" className={linkClass}>
                  Publicidad
                </Link>
              </>
            ) : null}
            <Link
              href="/login"
              className="rounded-md bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700"
            >
              Iniciar Sesión
            </Link>
          </div>

          <Link
            href="/login"
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 md:hidden"
          >
            Entrar
          </Link>
        </div>
      </div>
    </nav>
  );
}
