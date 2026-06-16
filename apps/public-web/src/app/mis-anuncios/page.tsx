'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getOrCreateFreeListingVisitorId } from '@/lib/free-listing-visitor';
import { getSavedFreeListings } from '@/lib/free-listing-storage';
import ShareListingPanel from '@/components/ShareListingPanel';

interface ListingItem {
  id: string;
  make: string;
  model: string;
  year: number;
  views: number;
  managementToken: string | null;
  expiresAt: string | null;
}

export default function MisAnunciosPage() {
  const [items, setItems] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const visitorId = getOrCreateFreeListingVisitorId();
      const saved = getSavedFreeListings();
      try {
        const r = await fetch(
          `/api/public/quick-listings/mine?visitorId=${encodeURIComponent(visitorId)}`,
          { cache: 'no-store' }
        );
        const j = await r.json().catch(() => ({ items: [] }));
        const fromApi: ListingItem[] = Array.isArray(j.items) ? j.items : [];

        const merged = new Map<string, ListingItem>();
        for (const s of saved) {
          merged.set(s.id, {
            id: s.id,
            make: s.make || '',
            model: s.model || '',
            year: s.year || 0,
            views: 0,
            managementToken: s.managementToken,
            expiresAt: null,
          });
        }
        for (const it of fromApi) merged.set(it.id, it);

        setItems(Array.from(merged.values()));
      } catch {
        setItems(
          saved.map((s) => ({
            id: s.id,
            make: s.make || '',
            model: s.model || '',
            year: s.year || 0,
            views: 0,
            managementToken: s.managementToken,
            expiresAt: null,
          }))
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <Link href="/" className="text-sm text-primary-600 hover:underline">
            ← Volver al inicio
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-3">Mis anuncios gratis</h1>
          <p className="text-slate-600 mt-2">
            Comparte el enlace de cada anuncio y mira cuántas personas lo visitan.
          </p>
        </header>

        {loading ? (
          <p className="text-slate-500 text-center py-12">Cargando…</p>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <p className="text-slate-600 mb-4">No tienes anuncios activos en este dispositivo.</p>
            <Link
              href="/publicar-gratis"
              className="inline-block px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700"
            >
              Publicar gratis
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {items.map((item) => (
              <section key={item.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                  {item.year} {item.make} {item.model}
                </h2>
                {item.managementToken ? (
                  <ShareListingPanel
                    listingId={item.id}
                    managementToken={item.managementToken}
                    vehicleLabel={`${item.year} ${item.make} ${item.model}`}
                    initialViews={item.views}
                  />
                ) : (
                  <p className="text-sm text-slate-500">
                    <Link href={`/anuncio/${item.id}`} className="text-primary-600 font-semibold hover:underline">
                      Ver anuncio
                    </Link>
                  </p>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
