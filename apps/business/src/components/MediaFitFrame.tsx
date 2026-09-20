import type { ReactNode } from 'react';

type MediaFitAspect = 'square' | 'photo' | 'video';

const ASPECT: Record<MediaFitAspect, string> = {
  square: 'aspect-square',
  photo: 'aspect-[4/3]',
  video: 'aspect-video',
};

/** Recuadro uniforme: la imagen/video se ve completa (`object-contain`), sin recorte. */
export function MediaFitFrame({
  children,
  aspect = 'square',
  className = '',
  background = 'bg-slate-100',
}: {
  children: ReactNode;
  aspect?: MediaFitAspect;
  className?: string;
  background?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${ASPECT[aspect]} ${background} ${className}`}>
      {children}
    </div>
  );
}

export const MEDIA_FIT_IMG = 'absolute inset-0 h-full w-full object-contain';
export const MEDIA_FIT_VIDEO = 'absolute inset-0 h-full w-full object-contain bg-black';
