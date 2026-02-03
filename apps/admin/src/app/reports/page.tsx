'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [leadsReport, setLeadsReport] = useState<LeadsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchReports();
  }, [period]);

  async function fetchReports() {
    setLoading(true);
    try {
      const [salesRes, leadsRes] = await Promise.all([
        fetch(`/api/reports/sales?period=${period}`, {
          cache: 'no-store',
        }),
        fetch(`/api/reports/leads?period=${period}`, {
          cache: 'no-store',
        }),
      ]);

      if (!salesRes.ok || !leadsRes.ok) {
        throw new Error('Error al cargar reportes');
      }

      const salesData = await salesRes.json().catch(() => ({ report: null }));
      const leadsData = await leadsRes.json().catch(() => ({ report: null }));

      setSalesReport(salesData.report || {
        total: 0,
        totalRevenue: 0,
        bySeller: {},
        byMonth: {},
        averageSalePrice: 0,
        conversionRate: 0,
      });
      
      setLeadsReport(leadsData.report || {
        total: 0,
        bySource: {},
        byStatus: {},
        byMonth: {},
        conversionRate: 0,
      });
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      // Establecer datos vacíos en caso de error
      setSalesReport({
        total: 0,
        totalRevenue: 0,
        bySeller: {},
        byMonth: {},
        averageSalePrice: 0,
        conversionRate: 0,
      });
      setLeadsReport({
        total: 0,
        bySource: {},
        byStatus: {},
        byMonth: {},
        conversionRate: 0,
      });
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

  // Preparar datos para gráficos
  const salesByMonthData = salesReport?.byMonth
    ? Object.entries(salesReport.byMonth).map(([month, data]) => ({
        month,
        ventas: data.count,
        revenue: data.revenue,
      }))
    : [];

  const salesBySellerData = salesReport?.bySeller
    ? Object.entries(salesReport.bySeller).map(([seller, data]) => ({
        seller,
        ventas: data.count,
        revenue: data.revenue,
      }))
    : [];

  const leadsBySourceData = leadsReport?.bySource
    ? Object.entries(leadsReport.bySource).map(([source, count]) => ({
        source,
        count,
      }))
    : [];

  const leadsByStatusData = leadsReport?.byStatus
    ? Object.entries(leadsReport.byStatus).map(([status, count]) => ({
        status,
        count,
      }))
    : [];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Reportes y Estadísticas</h1>
          <p className="text-gray-600 mt-2">
            Análisis detallado de ventas y leads en la plataforma
          </p>
        </div>
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

      {/* Resumen de Ventas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Total de Ventas</p>
          <p className="text-3xl font-bold">{salesReport?.total || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Revenue Total</p>
          <p className="text-3xl font-bold">
            ${salesReport?.totalRevenue.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Precio Promedio</p>
          <p className="text-3xl font-bold">
            ${salesReport?.averageSalePrice.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Tasa de Conversión</p>
          <p className="text-3xl font-bold">
            {salesReport?.conversionRate.toFixed(1) || 0}%
          </p>
        </div>
      </div>

      {/* Gráficos de Ventas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Ventas por Mes</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesByMonthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="ventas"
                stroke="#3B82F6"
                name="Ventas"
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Ventas por Vendedor</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesBySellerData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="seller" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ventas" fill="#3B82F6" name="Ventas" />
              <Bar dataKey="revenue" fill="#10B981" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resumen de Leads */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Total de Leads</p>
          <p className="text-3xl font-bold">{leadsReport?.total || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Tasa de Conversión</p>
          <p className="text-3xl font-bold">
            {leadsReport?.conversionRate.toFixed(1) || 0}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Leads por Mes</p>
          <p className="text-3xl font-bold">
            {Object.values(leadsReport?.byMonth || {}).reduce(
              (a, b) => a + b,
              0
            )}
          </p>
        </div>
      </div>

      {/* Gráficos de Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Leads por Fuente</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={leadsBySourceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ source, percent }) =>
                  `${source}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {leadsBySourceData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Leads por Estado</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={leadsByStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}




