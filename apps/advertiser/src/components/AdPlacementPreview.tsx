'use client';

import type { AdPlacement } from '@/lib/ad-placement-preview';
import { getPlacementPreviewSpec } from '@/lib/ad-placement-preview';

export interface AdPlacementPreviewProps {
  placement: AdPlacement;
  mediaType: 'image' | 'video';
  imageUrl?: string;
  videoUrl?: string;
  title: string;
  description: string;
  campaignName: string;
}

function MediaPlaceholder({ label }: { label: string }) {
  return (
    <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500 text-sm">
      {label}
    </div>
  );
}

function PatrocinadoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      Patrocinado
    </span>
  );
}

export function AdPlacementPreview({
  placement,
  mediaType,
  imageUrl,
  videoUrl,
  title,
  description,
  campaignName,
}: AdPlacementPreviewProps) {
  const spec = getPlacementPreviewSpec(placement);
  const displayTitle = title.trim() || 'Título del anuncio';
  const displayDesc =
    description.trim() || 'Aquí verás la descripción de tu anuncio.';
  const displayCampaign = campaignName.trim() || 'Nombre de campaña';

  const media =
    mediaType === 'video' ? (
      videoUrl ? (
        <video
          src={videoUrl}
          controls
          className="w-full h-full object-cover bg-black"
          playsInline
        />
      ) : (
        <MediaPlaceholder label="Sin video" />
      )
    ) : imageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt="Vista previa del anuncio"
        className="w-full h-full object-contain"
        decoding="async"
        loading="eager"
      />
    ) : (
      <MediaPlaceholder label="Sin imagen" />
    );

  if (spec.layout === 'between_immersive') {
    return (
      <div
        className="relative w-full overflow-hidden rounded-3xl shadow-lg border border-slate-200"
        style={{ height: spec.mediaHeightPx }}
      >
        <div className="absolute inset-0 bg-brand-black-deep">{media}</div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-transparent" />
        <div className="absolute inset-0 flex items-center p-6 md:p-10">
          <div className="max-w-xl text-white">
            <PatrocinadoBadge className="bg-primary-500/20 border border-primary-400/30 text-primary-100 mb-4" />
            <p className="text-[10px] uppercase tracking-wide text-white/60 mb-1">{displayCampaign}</p>
            <h4 className="text-2xl md:text-3xl font-black leading-tight mb-2">{displayTitle}</h4>
            <p className="text-sm md:text-base text-slate-200 line-clamp-3">{displayDesc}</p>
          </div>
        </div>
      </div>
    );
  }

  if (spec.layout === 'hero') {
    return (
      <div
        className="relative w-full overflow-hidden rounded-xl border-2 border-primary-500/20 shadow-xl"
        style={{ height: spec.mediaHeightPx }}
      >
        <div className="absolute inset-0 bg-brand-black-deep">{media}</div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent" />
        <div className="absolute inset-0 flex items-center px-6 md:px-10">
          <div className="text-white max-w-lg">
            <PatrocinadoBadge className="bg-white/20 border border-white/30 text-white mb-3" />
            <p className="text-[10px] uppercase tracking-wide text-white/70 mb-1">{displayCampaign}</p>
            <h4 className="text-2xl md:text-4xl font-black leading-tight mb-2">{displayTitle}</h4>
            <p className="text-sm md:text-lg text-white/90 line-clamp-2">{displayDesc}</p>
          </div>
        </div>
      </div>
    );
  }

  if (spec.layout === 'sidebar_card') {
    return (
      <div className="max-w-sm mx-auto bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="relative bg-brand-black-deep" style={{ height: spec.mediaHeightPx }}>
          {media}
          <div className="absolute top-3 right-3 z-10">
            <PatrocinadoBadge className="bg-white/10 backdrop-blur-md border border-white/20 text-white" />
          </div>
        </div>
        <div className="p-5">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">{displayCampaign}</p>
          <h4 className="font-extrabold text-slate-900 text-lg mb-2 line-clamp-2">{displayTitle}</h4>
          <p className="text-sm text-slate-600 line-clamp-3 mb-4">{displayDesc}</p>
          <span className="text-primary-600 font-bold text-sm">Más información →</span>
        </div>
      </div>
    );
  }

  // grid_card — sponsors_section
  return (
    <div className="max-w-xs mx-auto bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
      <div className="relative bg-slate-100" style={{ height: spec.mediaHeightPx }}>
        {media}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-3 right-3 z-10">
          <PatrocinadoBadge className="bg-white/10 backdrop-blur-md border border-white/20 text-white" />
        </div>
      </div>
      <div className="p-6">
        <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">{displayCampaign}</p>
        <h4 className="font-extrabold text-slate-900 text-lg mb-2 line-clamp-2">{displayTitle}</h4>
        <p className="text-sm text-slate-600 line-clamp-3 mb-4">{displayDesc}</p>
        <span className="block w-full text-center bg-primary-600 text-white py-2.5 rounded-xl text-sm font-bold">
          Más información
        </span>
      </div>
    </div>
  );
}
