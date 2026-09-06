'use client';

export function ShopProfileBadge({
  name,
  logoUrl,
  size = 'md',
}: {
  name: string;
  logoUrl?: string;
  size?: 'sm' | 'md';
}) {
  const box = size === 'sm' ? 'w-9 h-9 text-sm' : 'w-12 h-12 text-lg';
  return (
    <div className={`${box} rounded-xl overflow-hidden bg-slate-100 border flex items-center justify-center shrink-0`}>
      {logoUrl ? (
        <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold text-slate-500">{(name || 'N').charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}
