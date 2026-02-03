'use client';

import { useState, useEffect } from 'react';
import { FIMetrics } from '@autodealers/crm';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface FIMetricsDashboardProps {
  startDate?: Date;
  endDate?: Date;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function FIMetricsDashboard({ startDate, endDate }: FIMetricsDashboardProps) {
  const [metrics, setMetrics] = useState<FIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, [startDate, endDate]);

  async function fetchMetrics() {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await fetch(`/api/fi/metrics?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al obtener métricas');
      }

      const data = await response.json();
      setMetrics(data.metrics);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  // Preparar datos para gráficos
  const statusData = Object.entries(metrics.byStatus).map(([status, count]) => ({
    status: status.replace('_', ' ').toUpperCase(),
    count,
  }));

  const creditRangeData = Object.entries(metrics.byCreditRange).map(([range, data]) => ({
    name: range.toUpperCase(),
    requests: data.requests,
    approvals: data.approvals,
    approvalRate: data.approvalRate,
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <span className="text-sm text-gray-600">Tasa de Aprobación</span>
          <p className="text-2xl font-bold text-green-600">{metrics.approvalRate.toFixed(1)}%</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <span className="text-sm text-gray-600">Tiempo Promedio</span>
          <p className="text-2xl font-bold text-blue-600">{metrics.averageProcessingTime.toFixed(1)}h</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <span className="text-sm text-gray-600">Pendientes</span>
          <p className="text-2xl font-bold text-orange-600">{metrics.pendingRequests}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <span className="text-sm text-gray-600">Score Promedio</span>
          <p className="text-2xl font-bold text-purple-600">{metrics.averageCreditScore.toFixed(0)}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Distribución por Estado */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Solicitudes por Estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, count }) => `${status}: ${count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Aprobaciones por Rango de Crédito */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Aprobaciones por Rango de Crédito</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={creditRangeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="requests" fill="#8884d8" name="Solicitudes" />
              <Bar dataKey="approvals" fill="#82ca9d" name="Aprobaciones" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla de Vendedores */}
      {Object.keys(metrics.bySeller).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Performance por Vendedor</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solicitudes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aprobaciones</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rechazos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tasa Aprobación</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(metrics.bySeller).map(([sellerId, data]) => (
                  <tr key={sellerId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {(data as any).name || sellerId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {data.requests}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                      {data.approvals}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                      {data.rejections}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {data.approvalRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

