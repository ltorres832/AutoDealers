'use client';

import { useState, useEffect } from 'react';
import AdvancedReports from '@/components/AdvancedReports';

interface SalesReport {
  total: number;
  totalRevenue: number;
  averageSalePrice: number;
  conversionRate: number;
}

export default function ReportsPage() {
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/user', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(err => console.error('Error fetching user:', err));
    fetchReports();
  }, [period]);

  async function fetchReports() {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/sales?period=${period}`);
      const data = await response.json();
      setSalesReport(data.report);
    } catch (error) {
      console.error('Error:', error);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mis Reportes</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded ${
              period === 'week'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded ${
              period === 'month'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Mes
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 rounded ${
              period === 'year'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Año
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Mis Ventas</h2>
        {salesReport && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Total de Ventas</p>
              <p className="text-3xl font-bold">{salesReport.total}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Revenue Total</p>
              <p className="text-3xl font-bold text-green-600">
                ${salesReport.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Precio Promedio</p>
              <p className="text-2xl font-bold">
                ${salesReport.averageSalePrice.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tasa de Conversión</p>
              <p className="text-2xl font-bold">
                {salesReport.conversionRate.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Reportes Avanzados con Gráficos */}
      {user && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Reportes Avanzados</h2>
          <AdvancedReports tenantId={user.tenantId} />
        </div>
      )}
    </div>
  );
}





