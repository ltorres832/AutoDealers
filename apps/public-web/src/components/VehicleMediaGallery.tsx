'use client';

import { useEffect, useMemo, useState } from 'react';
import { handleImageError } from '@/lib/vehicle-image';
import { getVehicleMedia, videoEmbedSrc, type VehicleMediaSource } from '@/lib/vehicle-media';

function PlayMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.14v13.72L19.5 12 8 5.14z" />
    </svg>
  );
}

function firstPhotoIndex(media: ReturnType<typeof getVehicleMedia>) {
  const photo = media.findIndex((item) => item.kind === 'photo');
  return photo >= 0 ? photo : 0;
}

export default function VehicleMediaGallery({
  vehicle,
  compact = false,
}: {
  vehicle: VehicleMediaSource & {
    id?: string;
    year?: number;
    make?: string;
    model?: string;
  };
  compact?: boolean;
}) {
  const media = useMemo(() => getVehicleMedia(vehicle), [vehicle]);
  const [index, setIndex] = useState(() => firstPhotoIndex(media));
  const current = media[Math.min(index, Math.max(media.length - 1, 0))];
  const poster = media.find((item) => item.kind === 'photo')?.src;
  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
  const mediaMax = compact ? 'max-h-[min(48vh,26rem)]' : 'max-h-[min(62vh,34rem)]';

  useEffect(() => {
    setIndex(firstPhotoIndex(media));
  }, [vehicle.id, media]);

  function go(next: number) {
    if (media.length === 0) return;
    setIndex((next + media.length) % media.length);
  }

  if (!current) {
    return (
      <div className="flex aspect-video items-center justify-center border border-neutral-200 bg-neutral-100 text-sm text-neutral-500">
        Sin fotografías
      </div>
    );
  }

  const embed = current.kind === 'video' ? videoEmbedSrc(current.src) : null;

  return (
    <figure className="m-0 w-full">
      <div className="relative w-full bg-neutral-100">
        {current.kind === 'photo' ? (
          <img
            key={current.src}
            src={current.src}
            alt={title ? `${title} — foto ${index + 1}` : `Foto ${index + 1}`}
            className={`mx-auto block h-auto w-auto max-w-full ${mediaMax} object-contain object-center`}
            loading="eager"
            referrerPolicy="no-referrer"
            onError={handleImageError}
          />
        ) : embed ? (
          <div className="relative aspect-video w-full bg-neutral-950">
            <iframe
              key={current.src}
              src={embed}
              title={title ? `Video de ${title}` : 'Video del vehículo'}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <video
            key={current.src}
            src={current.src}
            controls
            playsInline
            poster={poster}
            className={`mx-auto block h-auto w-auto max-w-full ${mediaMax} bg-neutral-950 object-contain object-center`}
          >
            Tu navegador no soporta video.
          </video>
        )}

        {media.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 border border-white/30 bg-black/40 px-2 py-3 text-white transition hover:bg-black/65 sm:left-3"
              aria-label="Anterior"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 border border-white/30 bg-black/40 px-2 py-3 text-white transition hover:bg-black/65 sm:right-3"
              aria-label="Siguiente"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <figcaption className="pointer-events-none absolute bottom-3 right-3 z-10 bg-black/45 px-2 py-0.5 text-[11px] tracking-widest text-white/90">
              {String(index + 1).padStart(2, '0')} / {String(media.length).padStart(2, '0')}
              {current.kind === 'video' ? ' · VIDEO' : ''}
            </figcaption>
          </>
        ) : current.kind === 'video' ? (
          <figcaption className="pointer-events-none absolute bottom-3 right-3 z-10 bg-black/45 px-2 py-0.5 text-[11px] tracking-widest text-white/90">
            VIDEO
          </figcaption>
        ) : null}
      </div>

      {media.length > 1 ? (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 sm:mt-3 sm:gap-2">
          {media.map((item, i) => (
            <button
              key={`${item.kind}-${item.src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative h-14 w-20 shrink-0 overflow-hidden border bg-neutral-100 sm:h-16 sm:w-24 ${
                i === index ? 'border-neutral-900' : 'border-neutral-200 hover:border-neutral-400'
              }`}
              aria-label={item.kind === 'video' ? `Video ${i + 1}` : `Foto ${i + 1}`}
              aria-current={i === index}
            >
              {item.kind === 'photo' ? (
                <img
                  src={item.src}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={handleImageError}
                />
              ) : (
                <>
                  {poster ? (
                    <img
                      src={poster}
                      alt=""
                      className="h-full w-full object-cover opacity-80"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="h-full w-full bg-neutral-800" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white">
                    <PlayMark className="h-4 w-4" />
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </figure>
  );
}
