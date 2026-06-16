'use client';

import { useCallback, useEffect, useState } from 'react';

function buildShareText(title: string, url: string) {
  return `${title}\n${url}`;
}

interface ShareListingPanelProps {
  listingId: string;
  managementToken?: string;
  vehicleLabel: string;
  initialViews?: number;
  showMembershipCta?: boolean;
  registerPath?: string;
}

export default function ShareListingPanel({
  listingId,
  managementToken,
  vehicleLabel,
  initialViews = 0,
  showMembershipCta = true,
  registerPath = '/register?type=seller',
}: ShareListingPanelProps) {
  const [views, setViews] = useState(initialViews);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const refreshViews = useCallback(async () => {
    if (!managementToken) return;
    try {
      const r = await fetch(
        `/api/public/quick-listings/${listingId}/stats?token=${encodeURIComponent(managementToken)}`,
        { cache: 'no-store' }
      );
      if (!r.ok) return;
      const j = await r.json();
      if (typeof j.views === 'number') setViews(j.views);
    } catch {
      /* ignore */
    }
  }, [listingId, managementToken]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/anuncio/${listingId}`);
    }
  }, [listingId]);

  useEffect(() => {
    refreshViews();
    const id = window.setInterval(refreshViews, 30000);
    return () => window.clearInterval(id);
  }, [refreshViews]);

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const shareText = buildShareText(`Mira este auto: ${vehicleLabel}`, shareUrl);
  const waShare = shareUrl
    ? `https://wa.me/?text=${encodeURIComponent(shareText)}`
    : '#';
  const fbShare = shareUrl
    ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    : '#';
  const xShare = shareUrl
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    : '#';

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 mb-6">
      <h2 className="font-bold text-slate-900 mb-1">Comparte tu anuncio y genera visitas</h2>
      <p className="text-sm text-slate-600 mb-4">
        Copia el enlace o compártelo en redes. Cada visita cuenta para que más compradores te encuentren.
      </p>

      <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-xl border border-slate-200">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 mb-0.5">Enlace directo a tu anuncio</p>
          <p className="text-sm font-medium text-primary-700 truncate">{shareUrl || '…'}</p>
        </div>
        <button
          type="button"
          onClick={copyLink}
          className="shrink-0 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800"
        >
          {copied ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <a
          href={waShare}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700"
        >
          WhatsApp
        </a>
        <a
          href={fbShare}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
        >
          Facebook
        </a>
        <a
          href={xShare}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-900"
        >
          X / Twitter
        </a>
      </div>

      <div className="flex items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200">
        <div>
          <p className="text-xs text-slate-500">Personas que vieron tu anuncio</p>
          <p className="text-3xl font-extrabold text-slate-900">{views}</p>
        </div>
        <button
          type="button"
          onClick={refreshViews}
          className="text-sm text-primary-600 font-semibold hover:underline"
        >
          Actualizar
        </button>
      </div>

      {showMembershipCta ? (
        <p className="text-xs text-slate-500 mt-4">
          Con una membresía de vendedor obtienes más anuncios, estadísticas avanzadas, mensajería y financiamiento.{' '}
          <a href={registerPath} className="text-primary-600 font-semibold hover:underline">
            Ver beneficios
          </a>
        </p>
      ) : null}
    </div>
  );
}
