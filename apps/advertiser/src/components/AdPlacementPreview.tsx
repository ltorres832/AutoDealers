'use client';

import type { AdPlacement } from '@/lib/ad-placement-preview';
import { getPlacementPreviewSpec } from '@/lib/ad-placement-preview';

export interface AdPlacementPreviewProps {
  placement: AdPlacement;
  mediaType: 'image' | 'video';
  imageUrl?: string;
  images?: string[];
  animation?: string;
  videoUrl?: string;
  title?: string;
  description?: string;
  campaignName?: string;
}

function MediaPlaceholder({ label }: { label: string }) {
  return (
    <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500 text-sm">
      {label}
    </div>
  );
}

export function AdPlacementPreview({
  placement,
  mediaType,
  imageUrl,
  images,
  animation,
  videoUrl,
  title = '',
  description = '',
  campaignName = '',
}: AdPlacementPreviewProps) {
  const spec = getPlacementPreviewSpec(placement);
  const hasCampaign = campaignName.trim().length > 0;
  const hasTitle = title.trim().length > 0;
  const hasDesc = description.trim().length > 0;
  const hasTextOverlay = hasCampaign || hasTitle || hasDesc;

  const media =
    mediaType === 'video' ? (
      videoUrl ? (
        <video
          src={videoUrl}
          controls
          className="w-full h-full object-contain bg-brand-black-deep"
          playsInline
        />
      ) : (
        <MediaPlaceholder label="Sin video" />
      )
    ) : (images?.[0] || imageUrl) ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={images?.[0] || imageUrl}
        alt="Vista previa del anuncio"
        className={`w-full h-full object-contain bg-brand-black-deep ${
          animation === 'kenburns' ? 'scale-105' : ''
        }`}
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
        <div className="absolute inset-0">{media}</div>
        {hasTextOverlay && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-transparent" />
            <div className="absolute inset-0 flex items-center p-6 md:p-10">
              <div className="max-w-xl text-white">
                {hasCampaign && (
                  <p className="text-[10px] uppercase tracking-wide text-white/60 mb-1">
                    {campaignName.trim()}
                  </p>
                )}
                {hasTitle && (
                  <h4 className="text-2xl md:text-3xl font-black leading-tight mb-2">
                    {title.trim()}
                  </h4>
                )}
                {hasDesc && (
                  <p className="text-sm md:text-base text-slate-200 line-clamp-3">
                    {description.trim()}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (spec.layout === 'hero') {
    return (
      <div
        className="relative w-full overflow-hidden rounded-xl border-2 border-primary-500/20 shadow-xl"
        style={{ height: spec.mediaHeightPx }}
      >
        <div className="absolute inset-0">{media}</div>
        {hasTextOverlay && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent" />
            <div className="absolute inset-0 flex items-center px-6 md:px-10">
              <div className="text-white max-w-lg">
                {hasCampaign && (
                  <p className="text-[10px] uppercase tracking-wide text-white/70 mb-1">
                    {campaignName.trim()}
                  </p>
                )}
                {hasTitle && (
                  <h4 className="text-2xl md:text-4xl font-black leading-tight mb-2">
                    {title.trim()}
                  </h4>
                )}
                {hasDesc && (
                  <p className="text-sm md:text-lg text-white/90 line-clamp-2">
                    {description.trim()}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (spec.layout === 'vehicle_banner') {
    return (
      <div className="mx-auto w-full" style={{ maxWidth: spec.recommendedWidth }}>
        <div
          className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-950"
          style={{ aspectRatio: spec.aspectRatio }}
        >
          <div className="absolute inset-0">{media}</div>
          {hasTextOverlay ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-transparent" />
              <div className="absolute inset-0 flex items-center overflow-hidden px-4 py-3 sm:px-6 sm:py-4">
                <div className="max-w-[20rem] text-white">
                  {hasCampaign ? (
                    <p className="mb-0.5 text-[10px] uppercase tracking-wide text-white/60">
                      {campaignName.trim()}
                    </p>
                  ) : null}
                  {hasTitle ? (
                    <h4 className="mb-1 text-lg font-black leading-tight sm:text-xl">{title.trim()}</h4>
                  ) : null}
                  {hasDesc ? (
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-200">{description.trim()}</p>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  if (spec.layout === 'sidebar_card') {
    return (
      <div className="max-w-sm mx-auto bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="relative bg-brand-black-deep" style={{ height: spec.mediaHeightPx }}>
          {media}
        </div>
        {hasTextOverlay && (
          <div className="p-5">
            {hasCampaign && (
              <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                {campaignName.trim()}
              </p>
            )}
            {hasTitle && (
              <h4 className="font-extrabold text-slate-900 text-lg mb-2 line-clamp-2">
                {title.trim()}
              </h4>
            )}
            {hasDesc && (
              <p className="text-sm text-slate-600 line-clamp-3 mb-4">{description.trim()}</p>
            )}
            <span className="text-primary-600 font-bold text-sm">Más información →</span>
          </div>
        )}
      </div>
    );
  }

  // grid_card — sponsors_section
  return (
    <div className="max-w-xs mx-auto bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
      <div className="relative bg-slate-100" style={{ height: spec.mediaHeightPx }}>
        {media}
      </div>
      {hasTextOverlay && (
        <div className="p-6">
          {hasCampaign && (
            <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
              {campaignName.trim()}
            </p>
          )}
          {hasTitle && (
            <h4 className="font-extrabold text-slate-900 text-lg mb-2 line-clamp-2">
              {title.trim()}
            </h4>
          )}
          {hasDesc && (
            <p className="text-sm text-slate-600 line-clamp-3 mb-4">{description.trim()}</p>
          )}
          <span className="block w-full text-center bg-primary-600 text-white py-2.5 rounded-xl text-sm font-bold">
            Más información
          </span>
        </div>
      )}
    </div>
  );
}
