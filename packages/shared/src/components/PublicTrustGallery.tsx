'use client';

import React, { useMemo } from 'react';
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
          return (
            <figure
              key={`${item.url}-${index}`}
              className="group flex flex-col overflow-hidden rounded-2xl bg-gray-100 shadow-md ring-1 ring-black/5"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={caption || `Galería ${index + 1}`}
                  className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.02]"
                  loading={index < 4 ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={index < 2 ? 'high' : 'auto'}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
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
