'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface SponsoredContent {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  placement?: string;
  advertiserName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  linkUrl?: string;
}

function AdsPreviewContent() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<SponsoredContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const adId = searchParams.get('adId');
        const placement = searchParams.get('placement');
        const limit = searchParams.get('limit');

        const params = new URLSearchParams();
        if (adId) params.set('adId', adId);
        if (placement) params.set('placement', placement);
        if (limit) params.set('limit', limit);

        const qs = params.toString();
        const url = qs ? `/api/public/sponsored-content?${qs}` : '/api/public/sponsored-content';

        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'No se pudo obtener el contenido');
        }
        // El endpoint devuelve { content: [...] } (y antes items). Tomamos ambos.
        setItems(data.content || data.items || []);
      } catch (err: any) {
        setError(err?.message || 'Error al cargar anuncios');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Vista pública de anuncios activos</h1>
          <p className="text-gray-600">Contenido patrocinado aprobado y activo (filtra por fechas y estado)</p>
        </div>

        {loading && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Cargando anuncios...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-600">
            No hay anuncios activos para mostrar.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((ad) => (
            <div key={ad.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              {ad.imageUrl && (
                <img
                  src={ad.imageUrl}
                  alt={ad.title}
                  className="w-full h-48 object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              {ad.videoUrl && !ad.imageUrl && (
                <video controls className="w-full h-48 object-cover">
                  <source src={ad.videoUrl} />
                </video>
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                    {ad.placement || 'sponsors_section'}
                  </span>
                  {ad.status && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      {ad.status}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{ad.title}</h3>
                {ad.description && <p className="text-gray-700 text-sm">{ad.description}</p>}
                <div className="text-xs text-gray-500">
                  {ad.advertiserName ? `Anunciante: ${ad.advertiserName}` : 'Anunciante'}
                </div>
                {ad.linkUrl && (
                  <a
                    href={ad.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Visitar enlace →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdsPreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <AdsPreviewContent />
    </Suspense>
  );
}

