'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRealtimeAdvertiserPricing } from '@/hooks/useRealtimeAdvertiserPricing';

interface Campaign {
  id: string;
  title: string;
  type: string;
  placement: string;
  status: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  startDate: string;
  endDate: string;
}

interface AdvancedStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  averageCTR: number;
  conversionRate: number;
  trends: {
    impressions: Array<{ date: string; value: number }>;
    clicks: Array<{ date: string; value: number }>;
    conversions: Array<{ date: string; value: number }>;
  };
  topPerforming: Campaign[];
  monthlyComparison: {
    current: { impressions: number; clicks: number; conversions: number };
    previous: { impressions: number; clicks: number; conversions: number };
  };
}

export default function AdvancedDashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [advertiser, setAdvertiser] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  async function fetchData() {
    try {
      // Obtener información del anunciante
      const advertiserRes = await fetch('/api/advertiser/me');
      if (advertiserRes.ok) {
        const advertiserData = await advertiserRes.json();
        setAdvertiser(advertiserData.advertiser);
      }

      // Obtener campañas
      const campaignsRes = await fetch('/api/advertiser/campaigns');
      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData.campaigns || []);
        
        // Calcular estadísticas avanzadas
        const totalCampaigns = campaignsData.campaigns?.length || 0;
        const activeCampaigns = campaignsData.campaigns?.filter((c: Campaign) => c.status === 'active').length || 0;
        const totalImpressions = campaignsData.campaigns?.reduce((sum: number, c: Campaign) => sum + c.impressions, 0) || 0;
        const totalClicks = campaignsData.campaigns?.reduce((sum: number, c: Campaign) => sum + c.clicks, 0) || 0;
        const totalConversions = campaignsData.campaigns?.reduce((sum: number, c: Campaign) => sum + (c.conversions || 0), 0) || 0;
        const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

        // Top performing campaigns
        const topPerforming = [...campaignsData.campaigns]
          .sort((a: Campaign, b: Campaign) => {
            const aCTR = a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0;
            const bCTR = b.impressions > 0 ? (b.clicks / b.impressions) * 100 : 0;
            return bCTR - aCTR;
          })
          .slice(0, 5);

        // Generar datos de tendencias (simulado - en producción vendría de métricas diarias)
        const trends = generateTrendData(selectedPeriod, campaignsData.campaigns || []);

        // Comparación mensual
        const monthlyComparison = {
          current: {
            impressions: totalImpressions,
            clicks: totalClicks,
            conversions: totalConversions,
          },
          previous: {
            impressions: Math.floor(totalImpressions * 0.85), // Simulado
            clicks: Math.floor(totalClicks * 0.85),
            conversions: Math.floor(totalConversions * 0.85),
          },
        };

        setStats({
          totalCampaigns,
          activeCampaigns,
          totalImpressions,
          totalClicks,
          totalConversions,
          averageCTR,
          conversionRate,
          trends,
          topPerforming,
          monthlyComparison,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  function generateTrendData(period: string, campaigns: Campaign[]) {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const impressions: Array<{ date: string; value: number }> = [];
    const clicks: Array<{ date: string; value: number }> = [];
    const conversions: Array<{ date: string; value: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Simular datos (en producción vendría de métricas diarias)
      impressions.push({
        date: dateStr,
        value: Math.floor(Math.random() * 1000) + 500,
      });
      clicks.push({
        date: dateStr,
        value: Math.floor(Math.random() * 50) + 10,
      });
      conversions.push({
        date: dateStr,
        value: Math.floor(Math.random() * 5) + 1,
      });
    }

    return { impressions, clicks, conversions };
  }

  function getPercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Avanzado</h1>
            {advertiser && (
              <p className="text-sm text-gray-600">{advertiser.companyName} - Plan {advertiser.plan}</p>
            )}
          </div>
          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900 text-sm"
            >
              Vista Básica
            </Link>
            <Link
              href="/logout"
              className="text-gray-600 hover:text-gray-900 text-sm"
            >
              Cerrar Sesión
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Selector de período */}
        <div className="mb-6 flex justify-end">
          <div className="flex gap-2 border border-gray-300 rounded-lg overflow-hidden">
            {(['7d', '30d', '90d'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 text-sm font-medium ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {period === '7d' ? '7 días' : period === '30d' ? '30 días' : '90 días'}
              </button>
            ))}
          </div>
        </div>

        {/* Estadísticas principales */}
        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Total Impresiones</div>
                <div className="text-3xl font-bold text-gray-900">{stats.totalImpressions.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-2">
                  {getPercentageChange(stats.monthlyComparison.current.impressions, stats.monthlyComparison.previous.impressions) > 0 ? '↑' : '↓'}{' '}
                  {Math.abs(getPercentageChange(stats.monthlyComparison.current.impressions, stats.monthlyComparison.previous.impressions)).toFixed(1)}% vs mes anterior
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Total Clics</div>
                <div className="text-3xl font-bold text-blue-600">{stats.totalClicks.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-2">
                  {getPercentageChange(stats.monthlyComparison.current.clicks, stats.monthlyComparison.previous.clicks) > 0 ? '↑' : '↓'}{' '}
                  {Math.abs(getPercentageChange(stats.monthlyComparison.current.clicks, stats.monthlyComparison.previous.clicks)).toFixed(1)}% vs mes anterior
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">CTR Promedio</div>
                <div className="text-3xl font-bold text-green-600">{stats.averageCTR.toFixed(2)}%</div>
                <div className="text-xs text-gray-500 mt-2">Tasa de clics promedio</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Tasa de Conversión</div>
                <div className="text-3xl font-bold text-purple-600">{stats.conversionRate.toFixed(2)}%</div>
                <div className="text-xs text-gray-500 mt-2">
                  {stats.totalConversions} conversiones de {stats.totalClicks} clics
                </div>
              </div>
            </div>

            {/* Gráficos de tendencias */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Impresiones</h3>
                <div className="h-64 flex items-end justify-between gap-1">
                  {stats.trends.impressions.slice(-7).map((point, index) => {
                    const maxValue = Math.max(...stats.trends.impressions.map(p => p.value));
                    const height = (point.value / maxValue) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                          style={{ height: `${height}%` }}
                          title={`${point.date}: ${point.value.toLocaleString()}`}
                        />
                        <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                          {new Date(point.date).toLocaleDateString('es', { day: '2-digit', month: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Clics</h3>
                <div className="h-64 flex items-end justify-between gap-1">
                  {stats.trends.clicks.slice(-7).map((point, index) => {
                    const maxValue = Math.max(...stats.trends.clicks.map(p => p.value), 1);
                    const height = (point.value / maxValue) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                          style={{ height: `${height}%` }}
                          title={`${point.date}: ${point.value.toLocaleString()}`}
                        />
                        <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                          {new Date(point.date).toLocaleDateString('es', { day: '2-digit', month: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Top performing campaigns */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Campañas con Mejor Rendimiento</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaña</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Impresiones</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clics</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CTR</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversiones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.topPerforming.map((campaign) => (
                      <tr key={campaign.id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{campaign.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{campaign.placement}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{campaign.impressions.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{campaign.clicks.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-semibold">{campaign.ctr.toFixed(2)}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{campaign.conversions || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Comparación mensual */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparación Mensual</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-gray-600 mb-2">Impresiones</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {stats.monthlyComparison.current.impressions.toLocaleString()}
                    </span>
                    <span className={`text-sm ${
                      getPercentageChange(stats.monthlyComparison.current.impressions, stats.monthlyComparison.previous.impressions) > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {getPercentageChange(stats.monthlyComparison.current.impressions, stats.monthlyComparison.previous.impressions) > 0 ? '↑' : '↓'}{' '}
                      {Math.abs(getPercentageChange(stats.monthlyComparison.current.impressions, stats.monthlyComparison.previous.impressions)).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Mes anterior: {stats.monthlyComparison.previous.impressions.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-2">Clics</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {stats.monthlyComparison.current.clicks.toLocaleString()}
                    </span>
                    <span className={`text-sm ${
                      getPercentageChange(stats.monthlyComparison.current.clicks, stats.monthlyComparison.previous.clicks) > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {getPercentageChange(stats.monthlyComparison.current.clicks, stats.monthlyComparison.previous.clicks) > 0 ? '↑' : '↓'}{' '}
                      {Math.abs(getPercentageChange(stats.monthlyComparison.current.clicks, stats.monthlyComparison.previous.clicks)).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Mes anterior: {stats.monthlyComparison.previous.clicks.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-2">Conversiones</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {stats.monthlyComparison.current.conversions.toLocaleString()}
                    </span>
                    <span className={`text-sm ${
                      getPercentageChange(stats.monthlyComparison.current.conversions, stats.monthlyComparison.previous.conversions) > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {getPercentageChange(stats.monthlyComparison.current.conversions, stats.monthlyComparison.previous.conversions) > 0 ? '↑' : '↓'}{' '}
                      {Math.abs(getPercentageChange(stats.monthlyComparison.current.conversions, stats.monthlyComparison.previous.conversions)).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Mes anterior: {stats.monthlyComparison.previous.conversions.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

