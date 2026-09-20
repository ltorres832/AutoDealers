'use client';

export function BusinessLogo({
  name,
  logoUrl,
  className = 'w-full h-full',
  rounded = 'rounded-xl',
}: {
  name: string;
  logoUrl?: string;
  className?: string;
  rounded?: string;
}) {
  const initial = (name || 'N').charAt(0).toUpperCase();
  return (
    <div
      className={`relative ${className} ${rounded} overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0`}
    >
      {logoUrl ? (
        <img src={logoUrl} alt={name} className="absolute inset-0 h-full w-full object-contain" />
      ) : (
        <span className="font-bold text-slate-400">{initial}</span>
      )}
    </div>
  );
}
