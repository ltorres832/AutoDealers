'use client';

import { AdCreativeSlideshow } from '@/components/AdCreativeSlideshow';
import {
  getAdCreativeImages,
  getAdCreativeVideo,
  type AdCreativeAnimation,
} from '@autodealers/core/ad-creative';

type Props = {
  images?: string[];
  imageUrl?: string;
  videoUrl?: string;
  videos?: string[];
  mediaType?: string;
  alt?: string;
  animation?: AdCreativeAnimation | string;
  intervalMs?: number;
  className?: string;
  imageClassName?: string;
  showDots?: boolean;
  showArrows?: boolean;
};

export function AdCreativeMedia({
  images,
  imageUrl,
  videoUrl,
  videos,
  mediaType,
  alt = 'Anuncio',
  animation,
  intervalMs,
  className = '',
  imageClassName,
  showDots,
  showArrows,
}: Props) {
  const video = getAdCreativeVideo({ videoUrl, videos, mediaType });
  const slides = getAdCreativeImages({ images, imageUrl });

  if (video && (mediaType === 'video' || slides.length === 0)) {
    return (
      <div className={`relative h-full min-h-[10rem] w-full overflow-hidden bg-brand-black-deep ${className}`}>
        <video
          src={video}
          muted
          autoPlay
          loop
          playsInline
          controls
          className="h-full w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  if (slides.length === 0) return null;

  return (
    <AdCreativeSlideshow
      images={slides}
      imageUrl={imageUrl}
      alt={alt}
      animation={animation}
      intervalMs={intervalMs}
      className={className}
      imageClassName={imageClassName}
      showDots={showDots}
      showArrows={showArrows}
    />
  );
}
