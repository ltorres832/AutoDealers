'use client';

import { useState, useEffect } from 'react';

interface AdvancedReportsDashboardProps {
  tenantId?: string;
  dateRange: '7d' | '30d' | '90d' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
}

interface ReportData {
  conversionBySource: { source: string; count: number; conversionRate: number }[];
  avgTimePerStage: { stage: string; avgHours: number }[];
  scoreByStage: { stage: string; avgScore: number }[];
  activityByDay: { date: string; leads: number; sales: number }[];
  performanceBySeller: { sellerId: string; sellerName: string; leads: number; sales: number; conversionRate: number }[];
  roiByChannel: { channel: string; cost: number; revenue: number; roi: number }[];
  responseRate: number;
  closeRate: number;
}

export default function AdvancedReportsDashboard({
  tenantId,
  dateRange,
  customStartDate,
  customEndDate,
}: AdvancedReportsDashboardProps) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, [tenantId, dateRange, customStartDate, customEndDate]);

  async function loadReportData() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (tenantId) params.append('tenantId', tenantId);
      params.append('dateRange', dateRange);
      if (customStartDate) params.append('startDate', customStartDate);
      if (customEndDate) params.append('endDate', customEndDate);

      const response = await fetch(`/api/admin/reports/advanced?${params}`, {
        credentials: 'include',
      });
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data) {
    return <div>No hay datos disponibles</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Tasa de Respuesta</h3>
          <p className="text-3xl font-bold text-primary-600">
            {(data.responseRate * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Tasa de Cierre</h3>
          <p className="text-3xl font-bold text-green-600">
            {(data.closeRate * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Leads Totales</h3>
          <p className="text-3xl font-bold text-gray-900">
            {data.conversionBySource.reduce((sum, item) => sum + item.count, 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Ventas Totales</h3>
          <p className="text-3xl font-bold text-primary-600">
            {data.performanceBySeller.reduce((sum, item) => sum + item.sales, 0)}
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversión por fuente */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Conversión por Fuente</h2>
          <div className="space-y-3">
            {data.conversionBySource.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{item.source}</span>
                  <span className="text-sm text-gray-600">
                    {item.count} leads • {(item.conversionRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${item.conversionRate * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tiempo promedio por etapa */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Tiempo Promedio por Etapa</h2>
          <div className="space-y-3">
            {data.avgTimePerStage.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{item.stage}</span>
                  <span className="text-sm text-gray-600">
                    {item.avgHours.toFixed(1)} horas
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: `${Math.min((item.avgHours / 168) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score promedio por etapa */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Score Promedio por Etapa</h2>
          <div className="space-y-3">
            {data.scoreByStage.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{item.stage}</span>
                  <span className="text-sm text-gray-600">
                    {item.avgScore.toFixed(1)} / 100
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${item.avgScore}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rendimiento por vendedor */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Rendimiento por Vendedor</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 text-sm font-medium">Vendedor</th>
                  <th className="text-right py-2 px-2 text-sm font-medium">Leads</th>
                  <th className="text-right py-2 px-2 text-sm font-medium">Ventas</th>
                  <th className="text-right py-2 px-2 text-sm font-medium">Conversión</th>
                </tr>
              </thead>
              <tbody>
                {data.performanceBySeller.map((item, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2 px-2 text-sm">{item.sellerName}</td>
                    <td className="py-2 px-2 text-sm text-right">{item.leads}</td>
                    <td className="py-2 px-2 text-sm text-right">{item.sales}</td>
                    <td className="py-2 px-2 text-sm text-right">
                      {(item.conversionRate * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ROI por canal */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">ROI por Canal</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 text-sm font-medium">Canal</th>
                <th className="text-right py-2 px-2 text-sm font-medium">Costo</th>
                <th className="text-right py-2 px-2 text-sm font-medium">Ingresos</th>
                <th className="text-right py-2 px-2 text-sm font-medium">ROI</th>
              </tr>
            </thead>
            <tbody>
              {data.roiByChannel.map((item, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2 px-2 text-sm">{item.channel}</td>
                  <td className="py-2 px-2 text-sm text-right">${item.cost.toFixed(2)}</td>
                  <td className="py-2 px-2 text-sm text-right">${item.revenue.toFixed(2)}</td>
                  <td className={`py-2 px-2 text-sm text-right font-medium ${
                    item.roi > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(item.roi * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actividad por día */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Actividad por Día</h2>
        <div className="h-64 flex items-end gap-2">
          {data.activityByDay.map((item, idx) => {
            const maxValue = Math.max(
              ...data.activityByDay.map(d => Math.max(d.leads, d.sales))
            );
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-1 justify-end" style={{ height: '200px' }}>
                  <div
                    className="w-full bg-primary-500 rounded-t"
                    style={{ height: `${(item.leads / maxValue) * 100}%` }}
                    title={`${item.leads} leads`}
                  ></div>
                  <div
                    className="w-full bg-green-500 rounded-t"
                    style={{ height: `${(item.sales / maxValue) * 100}%` }}
                    title={`${item.sales} ventas`}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 transform -rotate-45 origin-top-left whitespace-nowrap">
                  {new Date(item.date).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary-500"></div>
            <span className="text-sm">Leads</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500"></div>
            <span className="text-sm">Ventas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
