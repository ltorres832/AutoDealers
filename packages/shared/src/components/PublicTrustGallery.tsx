'use client';

import React from 'react';

export type PublicTrustGalleryProps = {
  photos: string[];
  title?: string;
  subtitle?: string;
  resolveUrl?: (url: string) => string;
};

export function PublicTrustGallery({
  photos,
  title = 'Nuestra experiencia',
  subtitle = 'Momentos reales con clientes satisfechos, entregas y eventos.',
  resolveUrl = (u) => u,
}: PublicTrustGalleryProps) {
  const items = photos.filter((p) => typeof p === 'string' && p.trim());
  if (items.length === 0) return null;

  return (
    <section className="py-12">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-2 text-gray-600">{subtitle}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        {items.map((photo, index) => (
          <div
            key={`${photo}-${index}`}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-black/5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveUrl(photo)}
              alt={`Galería ${index + 1}`}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
