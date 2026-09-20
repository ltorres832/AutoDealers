'use client';

import { useState } from 'react';
import Link from 'next/link';
import { videoEmbedSrc } from '@/lib/vehicle-media';
import {
  formatServiceDuration,
  formatServicePrice,
  serviceChipLabels,
  type PublicBusinessService,
} from '@/lib/business-catalog';

function ServiceVideo({ url, title }: { url: string; title: string }) {
  const embed = videoEmbedSrc(url);
  if (embed) {
    return (
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black">
        <iframe
          src={embed}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <video
        src={url}
        className="absolute inset-0 h-full w-full object-contain bg-black"
        controls
        preload="metadata"
      >
        <a href={url} className="text-primary-700 underline" target="_blank" rel="noreferrer">
          Ver video
        </a>
      </video>
    </div>
  );
}

export function BusinessServiceCard({
  service,
  detailHref,
  variant = 'card',
}: {
  service: PublicBusinessService;
  detailHref?: string;
  variant?: 'card' | 'detail';
}) {
  const photos = (service.photoUrls || []).filter(Boolean);
  const videos = (service.videoUrls || []).filter(Boolean);
  const [activePhoto, setActivePhoto] = useState(0);
  const specialties = serviceChipLabels(service, 'specialty');
  const scopes = serviceChipLabels(service, 'scope');
  const duration = formatServiceDuration(service.durationMinutes);
  const price = formatServicePrice(service.priceCents);
  const current = photos[Math.min(activePhoto, Math.max(photos.length - 1, 0))];

  return (
    <article
      className={`bg-white rounded-2xl border border-slate-100 overflow-hidden ${
        variant === 'detail' ? 'p-0' : ''
      }`}
    >
      <div className={variant === 'detail' ? 'p-5 sm:p-8' : 'p-4 sm:p-5'}>
        {photos.length > 0 ? (
          <div className="mb-4">
            <div
              className={`relative rounded-xl overflow-hidden bg-slate-100 ${
                variant === 'detail' ? 'aspect-[4/3]' : 'aspect-video'
              }`}
            >
              <img
                src={current}
                alt={`${service.name} — foto ${activePhoto + 1}`}
                className="absolute inset-0 h-full w-full object-contain"
              />
            </div>
            {photos.length > 1 ? (
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {photos.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActivePhoto(index)}
                    className={`relative w-16 h-16 rounded-lg overflow-hidden border shrink-0 bg-white ${
                      index === activePhoto ? 'border-primary-600 ring-2 ring-primary-200' : 'border-slate-200'
                    }`}
                  >
                    <img src={url} alt="" className="absolute inset-0 h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mb-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Este servicio aún no tiene fotos
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <h3 className={variant === 'detail' ? 'text-3xl font-black text-slate-900' : 'text-xl font-black text-slate-900'}>
            {service.name}
          </h3>
          <div className="text-right shrink-0">
            <div className="font-black text-primary-700">{price}</div>
            {duration ? <div className="text-sm text-slate-500">{duration}</div> : null}
          </div>
        </div>

        {service.description ? (
          <p className={`text-slate-700 whitespace-pre-wrap ${variant === 'detail' ? 'text-base' : 'text-sm'}`}>
            {service.description}
          </p>
        ) : (
          <p className="text-sm text-slate-400">Sin descripción</p>
        )}

        {specialties.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Qué cubre</p>
            <div className="flex flex-wrap gap-1.5">
              {specialties.map((item) => (
                <span key={item.slug} className="px-2.5 py-1 rounded-full bg-primary-50 text-primary-800 text-xs font-semibold">
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {scopes.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Para qué vehículos</p>
            <div className="flex flex-wrap gap-1.5">
              {scopes.map((item) => (
                <span key={item.slug} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {videos.length > 0 ? (
          <div className="mt-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Videos</p>
            {videos.map((url, index) => (
              <ServiceVideo key={url} url={url} title={`${service.name} — video ${index + 1}`} />
            ))}
          </div>
        ) : variant === 'detail' ? (
          <p className="mt-4 text-sm text-slate-400">Este servicio aún no tiene videos</p>
        ) : null}

        {detailHref ? (
          <Link href={detailHref} className="inline-block mt-4 text-sm font-bold text-primary-700 hover:underline">
            Ver ficha completa →
          </Link>
        ) : null}
      </div>
    </article>
  );
}
