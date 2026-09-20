'use client';

import React, { useMemo, useState } from 'react';
import {
  normalizePublicTrustGalleryItems,
  type PublicTrustGalleryItem,
} from '../public-trust-gallery';

export type PublicTrustGalleryProps = {
  /** Legacy: lista de URLs */
  photos?: string[];
  /** Preferido: URL + descripción visible al público */
  items?: PublicTrustGalleryItem[];
  title?: string;
  subtitle?: string;
  resolveUrl?: (url: string) => string;
};

export function PublicTrustGallery({
  photos,
  items,
  title = 'Nuestra experiencia',
  subtitle = 'Momentos reales con clientes satisfechos, entregas y eventos.',
  resolveUrl = (u) => u,
}: PublicTrustGalleryProps) {
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(() => new Set());

  const galleryItems = useMemo(() => {
    if (items?.length) return items.filter((i) => i.url?.trim());
    if (photos?.length) return normalizePublicTrustGalleryItems(photos);
    return [];
  }, [items, photos]);

  if (galleryItems.length === 0) return null;

  return (
    <section className="py-12">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-2 text-gray-600">{subtitle}</p> : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {galleryItems.map((item, index) => {
          const src = resolveUrl(item.url.trim());
          const caption = item.caption?.trim();
          const broken = brokenUrls.has(src);
          return (
            <figure
              key={`${item.url}-${index}`}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-md"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                {broken ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200 px-4 text-center text-slate-500">
                    <span className="text-3xl" aria-hidden>
                      📷
                    </span>
                    <span className="text-xs font-medium">Foto no disponible</span>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={src}
                    alt={caption || `Galería ${index + 1}`}
                    className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.03]"
                    loading={index < 4 ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={index < 2 ? 'high' : 'auto'}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    onError={() => {
                      setBrokenUrls((prev) => {
                        if (prev.has(src)) return prev;
                        const next = new Set(prev);
                        next.add(src);
                        return next;
                      });
                    }}
                  />
                )}
              </div>
              {caption ? (
                <figcaption className="border-t border-gray-200/80 bg-white px-4 py-3 text-sm leading-snug text-gray-800">
                  {caption}
                </figcaption>
              ) : null}
            </figure>
          );
        })}
      </div>
    </section>
  );
}
