'use client';

import { useState, useEffect } from 'react';
import AdvancedReports from '@/components/AdvancedReports';
import { useAuth } from '@/hooks/useAuth';

interface SalesReport {
  total: number;
  totalRevenue: number;
  bySeller: Record<string, { count: number; revenue: number }>;
  byMonth: Record<string, { count: number; revenue: number }>;
  averageSalePrice: number;
  conversionRate: number;
}

interface LeadsReport {
  total: number;
  bySource: Record<string, number>;
  byStatus: Record<string, number>;
  byMonth: Record<string, number>;
  conversionRate: number;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [leadsReport, setLeadsReport] = useState<LeadsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [scope, setScope] = useState<'global' | 'dealer' | 'seller'>('global');
  const [selectedDealerId, setSelectedDealerId] = useState<string>('');
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [dealers, setDealers] = useState<Array<{ id: string; name: string }>>([]);
  const [sellers, setSellers] = useState<Array<{ id: string; name?: string; email?: string }>>([]);

  useEffect(() => {
    fetchDealersAndSellers();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [period, scope, selectedDealerId, selectedSellerId]);

  async function fetchDealersAndSellers() {
    try {
      const [dealersRes, sellersRes] = await Promise.all([
        fetch('/api/dealers'),
        fetch('/api/sellers'),
      ]);

      if (dealersRes.ok) {
        const dealersData = await dealersRes.json();
        setDealers(dealersData.dealers || []);
      }

      if (sellersRes.ok) {
        const sellersData = await sellersRes.json();
        setSellers(sellersData.sellers || []);
      }
    } catch (error) {
      console.error('Error fetching dealers/sellers:', error);
    }
  }

  async function fetchReports() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period,
        scope,
      });

      if (scope === 'dealer' && selectedDealerId) {
        params.append('dealerId', selectedDealerId);
      } else if (scope === 'seller' && selectedSellerId) {
        params.append('sellerId', selectedSellerId);
      }

      const [salesRes, leadsRes] = await Promise.all([
        fetch(`/api/reports/sales?${params.toString()}`),
        fetch(`/api/reports/leads?${params.toString()}`),
      ]);

      const salesData = await salesRes.json();
      const leadsData = await leadsRes.json();

      setSalesReport(salesData.report);
      setLeadsReport(leadsData.report);
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Reportes</h1>
        
        {/* Filtros de Alcance */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Alcance</label>
              <select
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value as 'global' | 'dealer' | 'seller');
                  setSelectedDealerId('');
                  setSelectedSellerId('');
                }}
                className="w-full border rounded px-3 py-2"
              >
                <option value="global">Global</option>
                <option value="dealer">Por Dealer</option>
                <option value="seller">Por Vendedor</option>
              </select>
            </div>

            {scope === 'dealer' && (
              <div>
                <label className="block text-sm font-medium mb-2">Dealer</label>
                <select
                  value={selectedDealerId}
                  onChange={(e) => setSelectedDealerId(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Seleccionar dealer...</option>
                  {dealers.map((dealer) => (
                    <option key={dealer.id} value={dealer.id}>
                      {dealer.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {scope === 'seller' && (
              <div>
                <label className="block text-sm font-medium mb-2">Vendedor</label>
                <select
                  value={selectedSellerId}
                  onChange={(e) => setSelectedSellerId(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Seleccionar vendedor...</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name || seller.email || 'Vendedor'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Período</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPeriod('week')}
                  className={`flex-1 px-3 py-2 rounded text-sm ${
                    period === 'week'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setPeriod('month')}
                  className={`flex-1 px-3 py-2 rounded text-sm ${
                    period === 'month'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Mes
                </button>
                <button
                  onClick={() => setPeriod('year')}
                  className={`flex-1 px-3 py-2 rounded text-sm ${
                    period === 'year'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Año
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Ventas</h2>
          {salesReport && (
            <div className="space-y-4">
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

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Leads</h2>
          {leadsReport && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Total de Leads</p>
                <p className="text-3xl font-bold">{leadsReport.total}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tasa de Conversión</p>
                <p className="text-2xl font-bold">
                  {leadsReport.conversionRate.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Por Fuente</p>
                <div className="space-y-1">
                  {Object.entries(leadsReport.bySource).map(([source, count]) => (
                    <div key={source} className="flex justify-between">
                      <span className="capitalize">{source}</span>
                      <span className="font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reportes Avanzados con Gráficos */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Reportes Avanzados</h2>
        <AdvancedReports tenantId={user?.tenantId || ''} />
      </div>
    </div>
  );
}



