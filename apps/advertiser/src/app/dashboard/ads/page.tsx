'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import { useRealtimeAds } from '../../../hooks/useRealtimeAds';

interface Ad {
  id: string;
  title: string;
  type: string;
  placement: string;
  status: string;
  impressions: number;
  clicks: number;
  ctr: number;
  startDate: Date;
  endDate: Date;
  imageUrl: string;
}

export default function AdsPage() {
  const [advertiserId, setAdvertiserId] = useState<string>('');
  const { ads: realtimeAds, loading } = useRealtimeAds(advertiserId);
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    // Obtener advertiserId
    fetch('/api/advertiser/me')
      .then(res => res.json())
      .then(data => {
        if (data.advertiser?.id) {
          setAdvertiserId(data.advertiser.id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    // Convertir anuncios de tiempo real al formato esperado
    const formattedAds = realtimeAds.map(ad => ({
      id: ad.id,
      title: ad.title,
      type: ad.type,
      placement: ad.placement,
      status: ad.status,
      impressions: ad.impressions || 0,
      clicks: ad.clicks || 0,
      ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
      startDate: ad.startDate ? new Date(ad.startDate) : new Date(),
      endDate: ad.endDate ? new Date(ad.endDate) : new Date(),
      imageUrl: ad.imageUrl || '',
    }));
    setAds(formattedAds);
  }, [realtimeAds]);

  async function handlePauseResume(adId: string, currentStatus: string) {
    try {
      const action = currentStatus === 'paused' ? 'resume' : 'pause';
      const response = await fetch(`/api/advertiser/ads/${adId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        if (response.ok) {
          // Los cambios se reflejarán automáticamente vía tiempo real
          // No necesitamos recargar manualmente
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
          console.error('Error pausing/resuming ad:', errorData);
        }
      } else {
        console.error('Expected JSON but got:', contentType);
      }
    } catch (error: any) {
      console.error('Error pausing/resuming ad:', error);
      if (error.message && (error.message.includes('JSON') || error.message.includes('DOCTYPE'))) {
        console.error('Received HTML instead of JSON');
      }
    }
  }

  function getStatusBadge(status: string) {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      active: 'bg-blue-100 text-blue-800',
      paused: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const labels = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      active: 'Activo',
      paused: 'Pausado',
      expired: 'Expirado',
      rejected: 'Rechazado',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Mis Anuncios</h1>
          <Link
            href="/dashboard/ads/create"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all"
          >
            + Crear Nuevo Anuncio
          </Link>
        </div>

        {ads.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📢</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes anuncios aún</h3>
            <p className="text-gray-600 mb-6">Crea tu primer anuncio para empezar a promocionar</p>
            <Link
              href="/dashboard/ads/create"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Crear Anuncio
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Anuncio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Impresiones</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clics</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CTR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ads.map((ad) => (
                    <tr key={ad.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={ad.imageUrl}
                            alt={ad.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{ad.title}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(ad.startDate).toLocaleDateString()} - {new Date(ad.endDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 capitalize">{ad.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 capitalize">{ad.placement}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(ad.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{ad.impressions.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{ad.clicks.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{ad.ctr.toFixed(2)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/ads/${ad.id}`}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Ver
                          </Link>
                          <Link
                            href={`/dashboard/ads/create?copyFrom=${ad.id}`}
                            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                          >
                            Reutilizar
                          </Link>
                          {ad.status === 'active' || ad.status === 'paused' ? (
                            <button
                              onClick={() => handlePauseResume(ad.id, ad.status)}
                              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                            >
                              {ad.status === 'paused' ? 'Reanudar' : 'Pausar'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

