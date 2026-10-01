'use client';

import type { ReactNode } from 'react';
import {
  normalizeWebsiteHeroMedia,
  type WebsiteHeroMediaMode,
} from '@autodealers/shared/website-hero-media';
import { parsePromoVideoUrl } from '@/lib/promo-video';

export type PublicHeroCtaProps = {
  title: string;
  subtitle?: string;
  cta?: ReactNode;
  /** Campos crudos de websiteSettings.hero */
  heroMedia?: {
    mediaMode?: WebsiteHeroMediaMode | string;
    backgroundImage?: string;
    backgroundVideoUrl?: string;
    heroVideoUrl?: string;
    showText?: boolean;
  } | null;
  /** Gradiente cuando mediaMode === 'gradient' o no hay media usable */
  gradientCss: string;
  className?: string;
  contentClassName?: string;
  minHeightClassName?: string;
};

/**
 * Hero de extremo a extremo. La imagen/video se muestra completa sin recortes.
 * El `<section>` es w-full y no está envuelto en ningún contenedor limitante.
 */
export default function PublicHeroCta({
  title,
  subtitle,
  cta,
  heroMedia,
  gradientCss,
  className = '',
  contentClassName = 'max-w-4xl mx-auto text-center relative z-10 px-4',
  minHeightClassName = 'min-h-[220px] sm:min-h-[280px] md:min-h-[320px]',
}: PublicHeroCtaProps) {
  const media = normalizeWebsiteHeroMedia(
    (heroMedia || {}) as Record<string, unknown>
  );

  const videoParsed =
    media.mediaMode === 'video' && media.backgroundVideoUrl
      ? parsePromoVideoUrl(media.backgroundVideoUrl)
      : null;

  const useImage =
    media.mediaMode === 'image' && Boolean(media.backgroundImage);
  const useVideo = media.mediaMode === 'video' && Boolean(videoParsed);
  const useCover = useImage || useVideo;

  // Determinar si mostrar texto basado en showText setting
  const shouldShowText = media.showText !== false;

  return (
    <section
      className={`relative w-full overflow-hidden text-white ${useCover ? '' : `flex items-center justify-center py-14 sm:py-16 ${minHeightClassName}`} ${className}`}
      style={useCover ? undefined : { background: gradientCss }}
    >
      {/* === IMAGEN: de extremo a extremo, completa, sin recorte === */}
      {useImage && media.backgroundImage ? (
        <div
          className="w-full flex items-center justify-center"
          style={{ background: '#000', lineHeight: 0 }}
        >
          <img
            src={media.backgroundImage}
            alt=""
            decoding="async"
            className="w-full h-auto max-h-[420px] sm:max-h-[520px] md:max-h-[620px]"
            style={{
              objectFit: 'contain',
              objectPosition: 'center',
              display: 'block',
            }}
          />
        </div>
      ) : null}

      {/* === VIDEO: de extremo a extremo, completo, sin recorte === */}
      {useVideo && videoParsed ? (
        <HeroVideoBackground parsed={videoParsed} poster={media.backgroundImage} />
      ) : null}

      {/* Decoración para modo gradiente */}
      {!useCover ? (
        <div className="pointer-events-none absolute inset-0 opacity-10" aria-hidden>
          <div className="absolute top-0 left-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-white" />
        </div>
      ) : null}

      {/* Banda de texto (debajo del media cuando hay imagen/video) */}
      {shouldShowText ? (
        <div
          className={useCover ? 'w-full py-10 sm:py-12' : undefined}
          style={useCover ? { background: gradientCss } : undefined}
        >
          <div className={contentClassName}>
            <h1 className="mx-auto mb-4 max-w-4xl px-2 text-3xl font-bold break-words whitespace-normal sm:text-4xl md:text-5xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mx-auto mb-8 max-w-3xl px-2 text-base break-words whitespace-normal text-white/90 sm:text-xl">
                {subtitle}
              </p>
            ) : null}
            {cta}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function HeroVideoBackground({
  parsed,
  poster,
}: {
  parsed: NonNullable<ReturnType<typeof parsePromoVideoUrl>>;
  poster?: string;
}) {
  /* ── Video directo (archivo mp4, webm, etc.) ── */
  if (parsed.kind === 'direct') {
    return (
      <div
        className="w-full flex items-center justify-center"
        style={{ background: '#000', lineHeight: 0 }}
      >
        <video
          className="w-full h-auto max-h-[420px] sm:max-h-[520px] md:max-h-[620px]"
          style={{ objectFit: 'contain', objectPosition: 'center', display: 'block' }}
          src={parsed.url}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      </div>
    );
  }

  /* ── YouTube / Vimeo embed: aspect-ratio 16/9, de borde a borde ── */
  const embedSrc =
    parsed.kind === 'youtube'
      ? `https://www.youtube.com/embed/${parsed.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${parsed.id}&playsinline=1&rel=0&modestbranding=1`
      : `https://player.vimeo.com/video/${parsed.id}?autoplay=1&muted=1&loop=1&background=1`;

  return (
    <div
      className="w-full"
      style={{ aspectRatio: '16 / 9', background: '#000', lineHeight: 0 }}
    >
      <iframe
        title="Hero video"
        src={embedSrc}
        allow="autoplay; encrypted-media; picture-in-picture"
        className="pointer-events-none w-full h-full border-0 block"
        style={{ display: 'block' }}
      />
    </div>
  );
}
