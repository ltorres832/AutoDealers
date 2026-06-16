import type { SponsoredLinkType } from '@/lib/sponsored-ad-link';

/** Origen del marketplace público (evita `/` que reescribe a la web del vendedor por defecto). */
export function getPublicMarketplaceOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '');
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'https://autodealers-7f62e.web.app'
  );
}

/**
 * URL final del clic en contenido patrocinado.
 * La raíz `/` en autodealers-7f62e.web.app muestra la web del vendedor configurado (no el marketplace).
 */
export function resolveSponsoredContentHref(
  linkType?: SponsoredLinkType,
  linkUrl?: string
): string {
  const base = getPublicMarketplaceOrigin();
  const raw = (linkUrl || '').trim();

  if (linkType === 'none' || !raw) {
    return '';
  }

  if (linkType === 'marketplace' || linkType === 'inventory') {
    return `${base}/search`;
  }

  if (linkType === 'contact') {
    return `${base}/contacto`;
  }

  if (linkType === 'external' || linkType === 'landing_page') {
    if (raw === '/' || raw === base || raw === `${base}/`) {
      return `${base}/search`;
    }
    return raw;
  }

  // Anuncios antiguos: marketplace guardado como URL raíz
  if (raw === '/' || raw === base || raw === `${base}/`) {
    return `${base}/search`;
  }

  return raw;
}

/** Texto del botón/CTA (sin sonar a “oferta” publicitaria). */
export const SPONSORED_CTA_LABEL = 'Más información';
