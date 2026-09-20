import type { ReactNode, SyntheticEvent } from 'react';

type VehicleImageFrameProps = {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  loading?: 'eager' | 'lazy';
  onError?: (event: SyntheticEvent<HTMLImageElement, Event>) => void;
  children?: ReactNode;
};

export default function VehicleImageFrame({
  src,
  alt,
  className = '',
  imageClassName = '',
  loading = 'lazy',
  onError,
  children,
}: VehicleImageFrameProps) {
  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-25 blur-xl"
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
      />
      <img
        src={src}
        alt={alt}
        className={`relative z-10 h-full w-full object-contain object-center ${imageClassName}`}
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={onError}
      />
      {children}
    </div>
  );
}
