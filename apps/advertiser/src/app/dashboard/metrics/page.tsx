'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';

interface PeriodMetric {
  period: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
}

interface MetricsData {
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalCTR: number;
  period: 'custom' | 'monthly' | 'weekly';
  startDate: string;
  endDate: string;
  monthlyMetrics: PeriodMetric[];
  weeklyMetrics: PeriodMetric[];
  dailyMetrics: PeriodMetric[];
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'custom' | 'monthly' | 'weekly'>('custom');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchMetrics();
  }, [dateRange, period]);

  async function fetchMetrics() {
    try {
      setLoading(true);
      let url = `/api/advertiser/metrics?period=${period}`;
      if (period === 'custom') {
        url += `&from=${dateRange.from}&to=${dateRange.to}`;
      }
      const response = await fetch(url);
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  function getCurrentMetrics(): PeriodMetric[] {
    if (!metrics) return [];
    if (period === 'weekly') return metrics.weeklyMetrics;
    if (period === 'monthly') return metrics.monthlyMetrics;
    return metrics.dailyMetrics;
  }

  function formatPeriodLabel(periodKey: string): string {
    if (period === 'weekly') {
      // Formato: YYYY-WW -> "Semana X de YYYY"
      const match = periodKey.match(/(\d{4})-W(\d{2})/);
      if (match) {
        return `Semana ${parseInt(match[2])} de ${match[1]}`;
      }
      return periodKey;
    } else if (period === 'monthly') {
      // Formato: YYYY-MM -> "Mes Año"
      const date = new Date(periodKey + '-01');
      return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    } else {
      // Formato: YYYY-MM-DD -> "DD de Mes, YYYY"
      const date = new Date(periodKey);
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    }
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
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Métricas y Estadísticas</h1>
          </div>
          
          {/* Selector de Período */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex flex-wrap gap-4 items-center">
              <label className="text-sm font-medium text-gray-700">Período:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPeriod('custom')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    period === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Personalizado
                </button>
                <button
                  onClick={() => setPeriod('monthly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    period === 'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Mensual
                </button>
                <button
                  onClick={() => setPeriod('weekly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    period === 'weekly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Semanal
                </button>
              </div>
            </div>

            {/* Selector de fechas (solo para período personalizado) */}
            {period === 'custom' && (
              <div className="flex gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="border border-gray-300 rounded-lg px-4 py-2 w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="border border-gray-300 rounded-lg px-4 py-2 w-full"
                  />
                </div>
              </div>
            )}

            {/* Información del período seleccionado */}
            {metrics && (
              <div className="mt-4 text-sm text-gray-600">
                {period === 'custom' && (
                  <span>
                    Mostrando datos del {new Date(metrics.startDate).toLocaleDateString('es-ES')} al{' '}
                    {new Date(metrics.endDate).toLocaleDateString('es-ES')}
                  </span>
                )}
                {period === 'monthly' && (
                  <span>Mostrando datos del mes actual</span>
                )}
                {period === 'weekly' && (
                  <span>Mostrando datos de la semana actual</span>
                )}
              </div>
            )}
          </div>
        </div>

        {metrics && (
          <>
            {/* Resumen General */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Total Impresiones</div>
                <div className="text-3xl font-bold text-gray-900">
                  {metrics.totalImpressions.toLocaleString()}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Total Clics</div>
                <div className="text-3xl font-bold text-blue-600">
                  {metrics.totalClicks.toLocaleString()}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">CTR Promedio</div>
                <div className="text-3xl font-bold text-green-600">
                  {metrics.totalCTR.toFixed(2)}%
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Conversiones</div>
                <div className="text-3xl font-bold text-purple-600">
                  {metrics.totalConversions.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Gráfico de Métricas por Período */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {period === 'weekly' && 'Métricas Semanales'}
                {period === 'monthly' && 'Métricas Mensuales'}
                {period === 'custom' && 'Métricas Diarias'}
              </h2>
              {getCurrentMetrics().length > 0 ? (
                <div className="space-y-4">
                  {getCurrentMetrics().map((metric) => (
                    <div key={metric.period} className="border-b border-gray-200 pb-4 last:border-0">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {formatPeriodLabel(metric.period)}
                        </h3>
                        <span className="text-sm text-gray-600">
                          CTR: {metric.ctr.toFixed(2)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Impresiones: </span>
                          <span className="font-semibold">{metric.impressions.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Clics: </span>
                          <span className="font-semibold text-blue-600">{metric.clicks.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Conversiones: </span>
                          <span className="font-semibold text-green-600">{metric.conversions.toLocaleString()}</span>
                        </div>
                      </div>
                      {/* Barra de progreso visual */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Rendimiento</span>
                          <span>{metric.ctr.toFixed(2)}% CTR</span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min((metric.clicks / Math.max(metric.impressions, 1)) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-gray-600 text-lg">
                    No hay métricas disponibles para el período seleccionado
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    Los datos aparecerán aquí una vez que tus anuncios comiencen a recibir impresiones y clics
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

