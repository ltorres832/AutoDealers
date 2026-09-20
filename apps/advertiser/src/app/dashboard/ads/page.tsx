'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import { useRealtimeAds } from '../../../hooks/useRealtimeAds';
import { AD_PLACEMENT_LABELS, type AdPlacement } from '@/lib/ad-placements';
import { resolveAdCreativePreviewSrc } from '@autodealers/core/ad-creative';

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
  images?: string[];
  videoUrl?: string;
  videos?: string[];
  mediaType?: string;
  animation?: string;
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
      images: Array.isArray(ad.images) ? ad.images : [],
      animation: ad.animation || '',
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
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
          alert(errorData.error || 'No se pudo cambiar el estado');
        }
      }
    } catch (error: unknown) {
      console.error('Error pausing/resuming ad:', error);
    }
  }

  async function handleDelete(adId: string, title: string) {
    if (!confirm(`¿Eliminar el anuncio "${title || 'sin título'}"?`)) return;
    try {
      const response = await fetch(`/api/advertiser/ads/${adId}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data.error || 'No se pudo eliminar el anuncio');
      }
    } catch (error: unknown) {
      console.error('Error deleting ad:', error);
      alert('Error al eliminar el anuncio');
    }
  }

  const deletableStatuses = new Set([
    'pending',
    'paused',
    'rejected',
    'cancelled',
    'payment_pending',
    'payment_failed',
    'queued_setup_pending',
    'queued',
  ]);

  function getStatusBadge(status: string) {
    const styles = {
      payment_pending: 'bg-orange-100 text-orange-800',
      pending: 'bg-yellow-100 text-yellow-800',
      queued_setup_pending: 'bg-amber-100 text-amber-800',
      queued: 'bg-primary-100 text-primary-800',
      activating: 'bg-primary-100 text-primary-800',
      payment_failed: 'bg-red-100 text-red-800',
      approved: 'bg-green-100 text-green-800',
      active: 'bg-primary-100 text-primary-800',
      paused: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const labels = {
      payment_pending: 'Pago pendiente',
      pending: 'Pendiente',
      queued_setup_pending: 'Guardando método',
      queued: 'En turno',
      activating: 'Activando',
      payment_failed: 'Pago falló',
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
            className="bg-gradient-to-r from-primary-600 to-primary-600 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-700 font-semibold transition-all"
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
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold"
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slideshow</th>
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
                          {(() => {
                            const preview = resolveAdCreativePreviewSrc(ad);
                            if (preview.kind === 'video') {
                              return (
                                <div className="relative h-16 w-16 overflow-hidden rounded bg-black">
                                  <video src={preview.src} className="h-full w-full object-cover" muted playsInline />
                                  <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 text-[9px] font-bold text-white">
                                    VIDEO
                                  </span>
                                </div>
                              );
                            }
                            if (preview.kind === 'image') {
                              return (
                                <img
                                  src={preview.src}
                                  alt={ad.title}
                                  className="h-16 w-16 rounded object-cover"
                                />
                              );
                            }
                            return <div className="h-16 w-16 rounded bg-gray-200" />;
                          })()}
                          <div>
                            <div className="font-medium text-gray-900">{ad.title || '(solo imagen)'}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(ad.startDate).toLocaleDateString()} - {new Date(ad.endDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 capitalize">{ad.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {AD_PLACEMENT_LABELS[ad.placement as AdPlacement] || ad.placement}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {Math.max(ad.images?.length || 0, ad.imageUrl ? 1 : 0) > 1
                          ? `${Math.max(ad.images?.length || 0, 1)} fotos`
                          : '1 foto'}
                        {ad.animation && ad.animation !== 'none' ? (
                          <span className="ml-1 text-xs text-gray-500">
                            · {ad.animation === 'kenburns' ? 'Ken Burns' : ad.animation === 'slide' ? 'deslizamiento' : 'fundido'}
                          </span>
                        ) : (
                          <span className="ml-1 text-xs text-gray-400">· sin movimiento</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(ad.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{ad.impressions.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{ad.clicks.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{ad.ctr.toFixed(2)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/ads/${ad.id}`}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            Ver
                          </Link>
                          <Link
                            href={`/dashboard/ads/create?copyFrom=${ad.id}`}
                            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                          >
                            Reutilizar
                          </Link>
                          {ad.status === 'active' || ad.status === 'approved' || ad.status === 'paused' ? (
                            <button
                              onClick={() => handlePauseResume(ad.id, ad.status)}
                              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                            >
                              {ad.status === 'paused' ? 'Reanudar' : 'Pausar'}
                            </button>
                          ) : null}
                          {deletableStatuses.has(ad.status) ? (
                            <button
                              onClick={() => handleDelete(ad.id, ad.title)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Eliminar
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

