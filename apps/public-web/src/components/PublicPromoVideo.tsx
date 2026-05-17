'use client';

import { parsePromoVideoUrl } from '@/lib/promo-video';

type Props = {
  url?: string | null;
  /** Contenedor exterior (márgenes, fondo) */
  className?: string;
  title?: string;
  compact?: boolean;
};

export default function PublicPromoVideo({
  url,
  className = '',
  title = 'Video promocional',
  compact = false,
}: Props) {
  const parsed = parsePromoVideoUrl(url || '');
  if (!parsed) return null;

  return (
    <div className={className} role="region" aria-label={title}>
      <div className={compact ? 'w-full' : 'max-w-5xl mx-auto'}>
        <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg bg-black ring-1 ring-black/10">
          {parsed.kind === 'youtube' ? (
            <iframe
              title={title}
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(parsed.id)}`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : parsed.kind === 'vimeo' ? (
            <iframe
              title={title}
              src={`https://player.vimeo.com/video/${encodeURIComponent(parsed.id)}`}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <video
              className="w-full h-full object-contain bg-black"
              controls
              playsInline
              preload="metadata"
              src={parsed.url}
            >
              Tu navegador no reproduce este formato de video.
            </video>
          )}
        </div>
      </div>
    </div>
  );
}
