'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SITE_INFO as DEFAULT_SITE_INFO, getSiteInfo } from '../config/site-info';
import { normalizePublicSiteLogoField } from '../lib/default-brand-logo';
import { resolvePublicMediaUrl } from '../lib/resolve-media-url';

export type PublicSiteBrandingInfo = typeof DEFAULT_SITE_INFO & {
  visibility?: { logo?: boolean; name?: boolean; tagline?: boolean };
};

function isPublicSiteLogoImage(logo: string): boolean {
  const u = logo.trim();
  if (!u) return false;
  if (
    u.startsWith('http://') ||
    u.startsWith('https://') ||
    u.startsWith('//') ||
    u.startsWith('/') ||
    u.startsWith('data:')
  ) {
    return true;
  }
  return /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(u);
}

function navbarLogoBadgeText(logo: string, siteName: string): string {
  const raw = logo.trim();
  if (raw && !isPublicSiteLogoImage(raw)) {
    const letters = raw.replace(/\s+/g, '').toUpperCase();
    return (letters.slice(0, 2) || siteName.replace(/\s+/g, '').slice(0, 2)).toUpperCase();
  }
  const fromName = siteName.replace(/\s+/g, '').slice(0, 2).toUpperCase();
  return fromName || 'AD';
}

export function PublicSiteNavbarBrand({
  siteInfo: controlled,
  href,
  className = '',
  nameClassName = 'text-xl font-bold text-slate-900 tracking-tight',
  taglineClassName = 'text-xs text-gray-500 font-normal',
}: {
  /** Si viene del padre (p. ej. home), evita un segundo fetch */
  siteInfo?: PublicSiteBrandingInfo;
  href?: string;
  className?: string;
  nameClassName?: string;
  taglineClassName?: string;
}) {
  const [fetched, setFetched] = useState<PublicSiteBrandingInfo>(
    DEFAULT_SITE_INFO as unknown as PublicSiteBrandingInfo
  );

  useEffect(() => {
    if (controlled !== undefined) return;
    let cancelled = false;
    getSiteInfo().then((info) => {
      if (!cancelled) {
        setFetched(
          normalizePublicSiteLogoField({
            ...DEFAULT_SITE_INFO,
            ...(info as object),
          }) as PublicSiteBrandingInfo
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [controlled]);

  const siteInfo = (controlled ?? fetched) as PublicSiteBrandingInfo;
  const rawLogo = String(siteInfo.logo ?? '').trim();
  const imgSrc = isPublicSiteLogoImage(rawLogo) ? resolvePublicMediaUrl(rawLogo) : undefined;
  const taglineText = String(siteInfo.tagline ?? '').trim();
  const vis = siteInfo.visibility;
  const showLogoMark = vis?.logo !== false;
  const showName = vis?.name !== false;
  const showTagline = vis?.tagline !== false && Boolean(taglineText);

  const showImageOnly = Boolean(imgSrc && showLogoMark);

  const inner = showImageOnly ? (
    // eslint-disable-next-line @next/next/no-img-element -- URL de marca desde Firestore o /public (dominio arbitrario)
    <img
      src={imgSrc!}
      alt={siteInfo.name}
      className="h-12 sm:h-14 w-auto max-w-[min(92vw,360px)] object-contain object-left"
    />
  ) : (
    <>
      {showLogoMark ? (
        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg tracking-tight">
            {navbarLogoBadgeText(rawLogo, siteInfo.name)}
          </span>
        </div>
      ) : null}
      <div>
        {showName ? <span className={nameClassName}>{siteInfo.name}</span> : null}
        {showTagline ? <p className={taglineClassName}>{taglineText}</p> : null}
      </div>
    </>
  );

  const wrapClass = `flex items-center gap-3 ${className}`.trim();
  if (href) {
    return (
      <Link href={href} className={wrapClass}>
        {inner}
      </Link>
    );
  }
  return <div className={wrapClass}>{inner}</div>;
}
