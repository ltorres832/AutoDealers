'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import PlanLimitsInfo from '../../components/PlanLimitsInfo';
import { useRealtimeAds } from '../../hooks/useRealtimeAds';

interface Campaign {
  id: string;
  title: string;
  type: string;
  placement: string;
  status: string;
  impressions: number;
  clicks: number;
  ctr: number;
  startDate: string;
  endDate: string;
}

interface Stats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalImpressions: number;
  totalClicks: number;
  averageCTR: number;
}

export default function AdvertiserDashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [advertiser, setAdvertiser] = useState<any>(null);

  const [advertiserId, setAdvertiserId] = useState<string>('');
  const { ads: realtimeAds, loading: adsLoading } = useRealtimeAds(advertiserId);

  useEffect(() => {
    // Obtener información del anunciante
    fetch('/api/advertiser/me')
      .then(res => res.json())
      .then(data => {
        if (data.advertiser?.id) {
          setAdvertiser(data.advertiser);
          setAdvertiserId(data.advertiser.id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    // Convertir anuncios de tiempo real a campañas y calcular estadísticas
    const formattedCampaigns = realtimeAds.map(ad => ({
      id: ad.id,
      title: ad.title,
      type: ad.type,
      placement: ad.placement,
      status: ad.status,
      impressions: ad.impressions || 0,
      clicks: ad.clicks || 0,
      ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
      startDate: ad.startDate || '',
      endDate: ad.endDate || '',
    }));
    
    setCampaigns(formattedCampaigns);
    
    // Calcular estadísticas
    const totalCampaigns = formattedCampaigns.length;
    const activeCampaigns = formattedCampaigns.filter((c: Campaign) => c.status === 'active').length;
    const totalImpressions = formattedCampaigns.reduce((sum: number, c: Campaign) => sum + c.impressions, 0);
    const totalClicks = formattedCampaigns.reduce((sum: number, c: Campaign) => sum + c.clicks, 0);
    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    setStats({
      totalCampaigns,
      activeCampaigns,
      totalImpressions,
      totalClicks,
      averageCTR,
    });
    
    setLoading(adsLoading);
  }, [realtimeAds, adsLoading]);

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
      approved: 'Aprobada',
      active: 'Activa',
      paused: 'Pausada',
      expired: 'Expirada',
      rejected: 'Rechazada',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Total Campañas</div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalCampaigns}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Activas</div>
              <div className="text-3xl font-bold text-blue-600">{stats.activeCampaigns}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Impresiones</div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalImpressions.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Clics</div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalClicks.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">CTR Promedio</div>
              <div className="text-3xl font-bold text-green-600">{stats.averageCTR.toFixed(2)}%</div>
            </div>
          </div>
        )}

        {/* Información de límites del plan */}
        {advertiser && advertiser.plan && (
          <div className="mb-8">
            <PlanLimitsInfo advertiserId={advertiser.id} plan={advertiser.plan} />
          </div>
        )}
        
        {/* Mensaje si no tiene plan */}
        {advertiser && !advertiser.plan && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  Selecciona un plan para crear anuncios
                </h3>
                <p className="text-yellow-800 mb-4">
                  Para comenzar a promocionar tus servicios, necesitas seleccionar un plan de suscripción.
                  Puedes explorar todas las funciones del dashboard, pero necesitarás un plan activo para crear y publicar anuncios.
                </p>
                <Link
                  href="/dashboard/plan"
                  className="inline-block bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 font-semibold"
                >
                  Ver Planes Disponibles
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Acciones Rápidas */}
        <div className="mb-8">
          <Link
            href="/campaigns/create"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all"
          >
            + Crear Nueva Campaña
          </Link>
        </div>

        {/* Lista de Campañas */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Mis Campañas</h2>
          </div>
          {campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📢</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes campañas aún</h3>
              <p className="text-gray-600 mb-6">Crea tu primera campaña para empezar a anunciar</p>
              <Link
                href="/campaigns/create"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Crear Campaña
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
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
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{campaign.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{campaign.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{campaign.placement}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(campaign.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{campaign.impressions.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{campaign.clicks.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{campaign.ctr.toFixed(2)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

