'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SITE_INFO as DEFAULT_SITE_INFO } from '../config/site-info';
import { normalizePublicSiteLogoField } from '../lib/default-brand-logo';
import { resolvePublicMediaUrl } from '../lib/resolve-media-url';
import type { PublicSiteBrandingInfo } from './PublicSiteNavbarBrand';

function isLogoImage(logo: string): boolean {
  const u = logo.trim();
  if (!u) return false;
  if (u.startsWith('http') || u.startsWith('//') || u.startsWith('/') || u.startsWith('data:')) {
    return true;
  }
  return /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(u);
}

export default function LandingFooter({
  siteInfo: siteInfoProp,
}: {
  siteInfo?: PublicSiteBrandingInfo;
}) {
  const currentYear = new Date().getFullYear();
  const siteInfo = normalizePublicSiteLogoField({
    ...DEFAULT_SITE_INFO,
    ...(siteInfoProp || {}),
  }) as PublicSiteBrandingInfo;

  const rawLogo = String(siteInfo.logo ?? '').trim();
  const logoSrc = isLogoImage(rawLogo) ? resolvePublicMediaUrl(rawLogo) : undefined;

  const [email, setEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<
    'idle' | 'loading' | 'ok' | 'already' | 'error'
  >('idle');
  const [newsletterMessage, setNewsletterMessage] = useState('');

  async function handleNewsletterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNewsletterStatus('loading');
    setNewsletterMessage('');
    try {
      const res = await fetch('/api/public/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNewsletterStatus('error');
        setNewsletterMessage(data.error || 'No se pudo completar la suscripción.');
        return;
      }
      setNewsletterStatus(data.alreadySubscribed ? 'already' : 'ok');
      setNewsletterMessage(
        data.alreadySubscribed
          ? 'Este email ya está suscrito.'
          : '¡Listo! Te avisaremos con novedades y ofertas.'
      );
      if (!data.alreadySubscribed) setEmail('');
    } catch {
      setNewsletterStatus('error');
      setNewsletterMessage('Error de conexión. Intenta de nuevo.');
    }
  }

  return (
    <footer className="relative overflow-hidden border-t border-brand-black bg-brand-black-deep pt-20 pb-10">
      <div className="pointer-events-none absolute top-0 right-0 -mr-48 -mt-48 h-96 w-96 rounded-full bg-primary-600/10 blur-3xl"></div>
      <div className="pointer-events-none absolute bottom-0 left-0 -ml-48 -mb-48 h-96 w-96 rounded-full bg-primary-600/5 blur-3xl"></div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-20 grid grid-cols-1 gap-16 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-8">
            <Link href="/" className="group inline-flex">
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoSrc}
                  alt={siteInfo.name}
                  className="h-14 w-auto max-w-[min(280px,85vw)] object-contain object-left brightness-0 invert sm:h-16"
                />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
                    <span className="text-2xl font-black tracking-tighter text-white">AD</span>
                  </div>
                  <div>
                    <span className="block text-2xl font-black leading-none tracking-tighter text-white">
                      {siteInfo.name}
                    </span>
                    {siteInfo.tagline ? (
                      <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-brand-silver">
                        {siteInfo.tagline}
                      </span>
                    ) : null}
                  </div>
                </div>
              )}
            </Link>

            <p className="text-lg font-medium leading-relaxed text-brand-silver">
              Reinventando la compra de vehículos con tecnología de punta, transparencia total y una
              red de socios certificados de confianza.
            </p>
          </div>

          <div className="lg:pl-10">
            <h4 className="relative mb-8 inline-block text-lg font-bold text-white">
              Plataforma
              <span className="absolute bottom-[-10px] left-0 h-1 w-12 rounded-full bg-primary-600"></span>
            </h4>
            <ul className="space-y-4">
              {[
                { name: 'Buscar Vehículos', href: '/search' },
                { name: 'Concesionarios', href: '/dealers?tab=concesionarios' },
                { name: 'Vendedores', href: '/dealers?tab=vendedores' },
                { name: 'Vende tu Auto', href: '/registro' },
                { name: 'Financiamiento', href: '/#financiamiento' },
                { name: 'Publicidad', href: '/advertise' },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 font-medium text-brand-silver transition-all duration-300 hover:translate-x-2 hover:text-white"
                  >
                    <span className="h-1.5 w-1.5 scale-0 rounded-full bg-primary-600 transition-transform group-hover:scale-100"></span>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="relative mb-8 inline-block text-lg font-bold text-white">
              Ayuda y Recursos
              <span className="absolute bottom-[-10px] left-0 h-1 w-12 rounded-full bg-primary-600"></span>
            </h4>
            <ul className="space-y-4">
              {[
                { name: 'Centro de Ayuda', href: '/faq' },
                { name: 'Sobre Nosotros', href: '/sobre-nosotros' },
                { name: 'Términos de Servicio', href: '/terminos' },
                { name: 'Privacidad', href: '/privacidad' },
                { name: 'Contacto', href: '/#contact' },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 font-medium text-brand-silver transition-all duration-300 hover:translate-x-2 hover:text-white"
                  >
                    <span className="h-1.5 w-1.5 scale-0 rounded-full bg-primary-600 transition-transform group-hover:scale-100"></span>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-brand-black bg-brand-black/80 p-8 backdrop-blur-xl">
            <div className="pointer-events-none absolute -mr-12 -mt-12 right-0 top-0 h-24 w-24 rounded-full bg-primary-600/10 blur-2xl"></div>

            <h4 className="relative z-10 mb-4 text-xl font-extrabold leading-tight text-white">
              Únete a nuestra Newsletter
            </h4>
            <p className="relative z-10 mb-6 text-sm font-medium leading-relaxed text-brand-silver">
              Recibe las mejores ofertas, lanzamientos y consejos para el cuidado de tu auto. Sin
              spam, solo contenido premium.
            </p>

            <form className="relative z-10 space-y-3" onSubmit={handleNewsletterSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-xl border border-brand-black-deep bg-brand-black-deep px-4 py-3 text-white placeholder-brand-silver/60 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-600"
                required
                disabled={newsletterStatus === 'loading'}
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'loading'}
                className="w-full rounded-xl bg-primary-600 py-3 font-bold text-white shadow-xl transition-all hover:-translate-y-0.5 hover:bg-primary-500 hover:shadow-primary-600/30 active:translate-y-0 disabled:opacity-60"
              >
                {newsletterStatus === 'loading' ? 'Enviando…' : 'Suscribirme Gratuitamente'}
              </button>
              {newsletterMessage ? (
                <p
                  className={`text-sm font-medium ${
                    newsletterStatus === 'error' ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {newsletterMessage}
                </p>
              ) : null}
            </form>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-6 border-t border-brand-black pt-10 md:flex-row">
          <div className="text-sm font-medium text-brand-silver">
            © {currentYear} {siteInfo.copyright?.company || siteInfo.name}. Todos los derechos
            reservados.
          </div>

          <div className="flex items-center gap-8 text-sm font-medium text-brand-silver">
            <Link href="/terminos" className="transition-colors hover:text-white">
              Términos
            </Link>
            <Link href="/privacidad" className="transition-colors hover:text-white">
              Privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
