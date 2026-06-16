'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface QuickListingItem {
  id: string;
  contactName: string;
  contactPhone: string;
  city: string | null;
  make: string;
  model: string;
  year: number;
  mileage: number | null;
  price: number;
  currency: string;
  condition: string;
  transmission: string | null;
  fuelType: string | null;
  color: string | null;
  bodyType: string | null;
  description: string | null;
  photos: string[];
  expiresAt: string | null;
}

function formatPrice(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Math.round(value).toLocaleString('en-US')}`;
  }
}

function digitsOnly(s: string): string {
  return s.replace(/\D+/g, '');
}

function truncateText(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function mileageLabel(n: number): string {
  const s = n.toLocaleString('es-PR');
  if (n === 1) return `${s} milla`;
  return `${s} millas`;
}

export default function QuickListingsSection({ quickListingPath }: { quickListingPath?: string }) {
  const [items, setItems] = useState<QuickListingItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/public/quick-listings?limit=12', { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) setItems((j.items || []) as QuickListingItem[]);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (!items || items.length === 0) return null;

  return (
    <section className="py-12 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">Vendedores particulares</h2>
            <p className="text-slate-500 text-sm mt-1">Nombre, teléfono y datos del vehículo.</p>
          </div>
          <Link
            href={quickListingPath || '/publicar-gratis'}
            className="px-4 py-2 bg-primary-600 text-white text-sm rounded-xl font-semibold hover:bg-primary-700"
          >
            Publicar el mío
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {items.map((it) => {
            const phoneDigits = digitsOnly(it.contactPhone);
            const cover = it.photos[0];
            return (
              <article
                key={it.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                <Link href={`/anuncio/${it.id}`} className="block flex-1 min-h-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-t-2xl">
                  <div className="relative aspect-[16/10] bg-slate-100">
                    {cover ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={cover}
                        alt={`${it.make} ${it.model}`}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                        Sin foto
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold text-slate-600 mb-0.5">{it.contactName}</p>
                    <h3 className="font-bold text-slate-900 truncate">
                      {it.year} {it.make} {it.model}
                    </h3>
                    <div className="text-xl font-extrabold text-primary-700 mb-2">
                      {formatPrice(it.price, it.currency)}
                    </div>
                    <ul className="text-xs text-slate-500 space-y-0.5 mb-2">
                      {it.mileage != null && <li>{mileageLabel(it.mileage)}</li>}
                      {it.color && <li className="capitalize">Color: {it.color}</li>}
                      {it.bodyType && <li className="capitalize">{it.bodyType}</li>}
                      {it.transmission && <li className="capitalize">{it.transmission}</li>}
                      {it.fuelType && <li className="capitalize">{it.fuelType}</li>}
                      {it.city && <li>{it.city}</li>}
                    </ul>
                    {it.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 mb-2">{truncateText(it.description, 160)}</p>
                    )}
                    <span className="text-primary-600 text-xs font-semibold group-hover:underline">
                      Ver detalle y todas las fotos →
                    </span>
                  </div>
                </Link>
                <div className="px-4 pb-4 flex gap-2 mt-auto">
                  {phoneDigits ? (
                    <a
                      href={`tel:+${phoneDigits}`}
                      className="flex-1 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg text-center hover:bg-primary-700"
                    >
                      Llamar
                    </a>
                  ) : null}
                  {phoneDigits ? (
                    <a
                      href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(
                        `Hola ${it.contactName}, vi tu anuncio del ${it.year} ${it.make} ${it.model}.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg text-center hover:bg-emerald-700"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
