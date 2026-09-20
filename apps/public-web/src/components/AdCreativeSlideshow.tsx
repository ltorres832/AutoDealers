'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getAdCreativeImages,
  normalizeAdAnimation,
  type AdCreativeAnimation,
} from '@autodealers/core/ad-creative';

type Props = {
  images?: string[];
  imageUrl?: string;
  alt?: string;
  animation?: AdCreativeAnimation | string;
  intervalMs?: number;
  className?: string;
  imageClassName?: string;
  showDots?: boolean;
  showArrows?: boolean;
};

export function AdCreativeSlideshow({
  images,
  imageUrl,
  alt = 'Anuncio',
  animation,
  intervalMs = 5000,
  className = '',
  imageClassName = 'object-contain bg-brand-black-deep',
  showDots = true,
  showArrows = true,
}: Props) {
  const slides = getAdCreativeImages({ images, imageUrl });
  const style = normalizeAdAnimation(animation);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setIndex(0);
  }, [slides.join('|')]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [slides.length, paused, intervalMs]);

  if (slides.length === 0) return null;

  const goTo = (next: number) => {
    setIndex((next + slides.length) % slides.length);
    setPaused(true);
    setTimeout(() => setPaused(false), 8000);
  };

  const animClass =
    style === 'kenburns'
      ? 'ad-creative-kenburns'
      : style === 'slide'
        ? 'ad-creative-slide'
        : style === 'fade'
          ? 'ad-creative-fade'
          : '';

  return (
    <div
      className={`relative h-full min-h-[10rem] w-full overflow-hidden ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        const end = e.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (start == null || end == null || slides.length <= 1) return;
        const delta = end - start;
        if (Math.abs(delta) < 40) return;
        goTo(delta < 0 ? index + 1 : index - 1);
      }}
    >
      {slides.map((src, i) => {
        const active = i === index;
        const slidePos =
          style === 'slide'
            ? active
              ? 'opacity-100 translate-x-0'
              : i < index
                ? 'opacity-0 -translate-x-8'
                : 'opacity-0 translate-x-8'
            : active
              ? 'opacity-100'
              : 'opacity-0';
        return (
          <div
            key={`${src}-${i}`}
            className={`absolute inset-0 transition-all duration-700 ease-out ${slidePos} ${
              active ? 'z-10' : 'z-0 pointer-events-none'
            }`}
          >
            <img
              src={src}
              alt={alt}
              className={`h-full w-full ${imageClassName} ${active ? animClass : ''}`}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect fill="%231e293b" width="800" height="400"/%3E%3C/svg%3E';
                target.onerror = null;
              }}
            />
          </div>
        );
      })}

      {slides.length > 1 && showArrows && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goTo(index - 1);
            }}
            className="absolute left-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 sm:h-10 sm:w-10"
            aria-label="Foto anterior"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goTo(index + 1);
            }}
            className="absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 sm:h-10 sm:w-10"
            aria-label="Foto siguiente"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {slides.length > 1 && showDots && (
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5 backdrop-blur-sm">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goTo(i);
              }}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-5 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Ir a foto ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
