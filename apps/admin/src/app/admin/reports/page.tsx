'use client';

import { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
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

interface MembershipsReport {
  totalTenants: number;
  byMembership: Record<string, number>;
  byStatus: Record<string, number>;
  revenueByMembership: Record<string, number>;
  totalRevenue: number;
  byMonth: Record<string, { count: number; revenue: number }>;
  averageRevenuePerTenant: number;
}

interface PromotionsReport {
  campaigns: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    byMonth: Record<string, number>;
  };
  premiumPromotions: {
    total: number;
    byStatus: Record<string, number>;
    byMonth: Record<string, { count: number; revenue: number }>;
    totalRevenue: number;
    averageRevenue: number;
  };
}

interface PlatformReport {
  reviews: {
    total: number;
    averageRating: number;
    byStatus: Record<string, number>;
  };
  inventory: {
    total: number;
    byStatus: Record<string, number>;
    byCondition: Record<string, number>;
  };
  appointments: {
    total: number;
    byStatus: Record<string, number>;
    byMonth: Record<string, number>;
  };
  preQualifications: {
    total: number;
    byScore: Record<string, number>;
  };
  socialPosts: {
    total: number;
    byPlatform: Record<string, number>;
  };
  customerFiles: {
    total: number;
  };
}

export default function ReportsPage() {
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [leadsReport, setLeadsReport] = useState<LeadsReport | null>(null);
  const [membershipsReport, setMembershipsReport] = useState<MembershipsReport | null>(null);
  const [promotionsReport, setPromotionsReport] = useState<PromotionsReport | null>(null);
  const [platformReport, setPlatformReport] = useState<PlatformReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReports();
  }, [period]);

  async function fetchReports() {
    setLoading(true);
    try {
      const [salesRes, leadsRes, membershipsRes, promotionsRes, platformRes] = await Promise.all([
        fetch(`/api/reports/sales?period=${period}`, { cache: 'no-store' }),
        fetch(`/api/reports/leads?period=${period}`, { cache: 'no-store' }),
        fetch(`/api/reports/memberships?period=${period}`, { cache: 'no-store' }),
        fetch(`/api/reports/promotions?period=${period}`, { cache: 'no-store' }),
        fetch(`/api/reports/platform?period=${period}`, { cache: 'no-store' }),
      ]);

      const salesData = await salesRes.json().catch(() => ({ report: null }));
      const leadsData = await leadsRes.json().catch(() => ({ report: null }));
      const membershipsData = await membershipsRes.json().catch(() => ({ report: null }));
      const promotionsData = await promotionsRes.json().catch(() => ({ report: null }));
      const platformData = await platformRes.json().catch(() => ({ report: null }));

      setSalesReport(salesData.report);
      setLeadsReport(leadsData.report);
      setMembershipsReport(membershipsData.report);
      setPromotionsReport(promotionsData.report);
      setPlatformReport(platformData.report);
    } catch (error: any) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleExportCSV() {
    if (!salesReport || !leadsReport || !membershipsReport) return;

    // Crear CSV con todos los datos
    const csvRows = [
      ['Reporte General de la Plataforma'],
      ['Período', period],
      ['Fecha de Generación', new Date().toLocaleDateString()],
      [],
      ['=== VENTAS ==='],
      ['Total de Ventas', salesReport.total],
      ['Revenue Total', salesReport.totalRevenue],
      ['Precio Promedio', salesReport.averageSalePrice],
      ['Tasa de Conversión', `${salesReport.conversionRate}%`],
      [],
      ['=== LEADS ==='],
      ['Total de Leads', leadsReport.total],
      ['Tasa de Conversión', `${leadsReport.conversionRate}%`],
      [],
      ['=== MEMBRESÍAS ==='],
      ['Total de Tenants', membershipsReport.totalTenants],
      ['Revenue de Membresías', membershipsReport.totalRevenue],
      ['Promedio por Tenant', membershipsReport.averageRevenuePerTenant],
      [],
      ['=== PROMOCIONES ==='],
      ['Total de Campaigns', promotionsReport?.campaigns.total || 0],
      ['Promociones Premium', promotionsReport?.premiumPromotions.total || 0],
      ['Revenue de Promociones', promotionsReport?.premiumPromotions.totalRevenue || 0],
    ];

    const csv = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  // Preparar datos para gráficos
  const salesByMonthData = salesReport?.byMonth
    ? Object.entries(salesReport.byMonth).map(([month, data]) => ({
        month,
        ventas: data.count,
        revenue: data.revenue,
      }))
    : [];

  const membershipData = membershipsReport?.byMembership
    ? Object.entries(membershipsReport.byMembership).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  const membershipRevenueData = membershipsReport?.byMonth
    ? Object.entries(membershipsReport.byMonth).map(([month, data]) => ({
        month,
        tenants: data.count,
        revenue: data.revenue,
      }))
    : [];

  const campaignsByTypeData = promotionsReport?.campaigns.byType
    ? Object.entries(promotionsReport.campaigns.byType).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  const inventoryByStatusData = platformReport?.inventory.byStatus
    ? Object.entries(platformReport.inventory.byStatus).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
          }
        }
      `}</style>

      <div className="container mx-auto px-4 py-8 print-content" ref={printRef}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6 no-print">
          <div>
            <h1 className="text-3xl font-bold">Reportes Completos de la Plataforma</h1>
            <p className="text-gray-600 mt-2">
              Análisis detallado de todas las métricas del sistema
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6 no-print">
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

        {/* Resumen Ejecutivo */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">📊 Resumen Ejecutivo</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm opacity-90">Total Tenants</p>
              <p className="text-3xl font-bold">{membershipsReport?.totalTenants || 0}</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Total Ventas</p>
              <p className="text-3xl font-bold">{salesReport?.total || 0}</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Revenue Total</p>
              <p className="text-3xl font-bold">
                ${((membershipsReport?.totalRevenue || 0) + (salesReport?.totalRevenue || 0)).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm opacity-90">Total Leads</p>
              <p className="text-3xl font-bold">{leadsReport?.total || 0}</p>
            </div>
          </div>
        </div>

        {/* MEMBRESÍAS Y SUSCRIPCIONES */}
        <div className="mb-8 page-break">
          <h2 className="text-2xl font-bold mb-4">💼 Membresías y Suscripciones</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Total de Tenants</p>
              <p className="text-3xl font-bold">{membershipsReport?.totalTenants || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Revenue Mensual</p>
              <p className="text-3xl font-bold text-green-600">
                ${membershipsReport?.totalRevenue.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Promedio por Tenant</p>
              <p className="text-3xl font-bold">
                ${membershipsReport?.averageRevenuePerTenant.toFixed(2) || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Tenants Activos</p>
              <p className="text-3xl font-bold text-blue-600">
                {membershipsReport?.byStatus.active || 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">Distribución de Membresías</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={membershipData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {membershipData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">Crecimiento de Tenants y Revenue</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={membershipRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="tenants" stackId="1" stroke="#3B82F6" fill="#3B82F6" name="Tenants" />
                  <Area type="monotone" dataKey="revenue" stackId="2" stroke="#10B981" fill="#10B981" name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* VENTAS */}
        <div className="mb-8 page-break">
          <h2 className="text-2xl font-bold mb-4">💰 Ventas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Total de Ventas</p>
              <p className="text-3xl font-bold">{salesReport?.total || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Revenue Total</p>
              <p className="text-3xl font-bold text-green-600">
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
              <p className="text-3xl font-bold text-blue-600">
                {salesReport?.conversionRate.toFixed(1) || 0}%
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-4">Tendencia de Ventas y Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesByMonthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ventas" stroke="#3B82F6" name="Ventas" strokeWidth={2} />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" name="Revenue" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PROMOCIONES Y CAMPAIGNS */}
        <div className="mb-8 page-break">
          <h2 className="text-2xl font-bold mb-4">🎯 Promociones y Campaigns</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Total Campaigns</p>
              <p className="text-3xl font-bold">{promotionsReport?.campaigns.total || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Promociones Premium</p>
              <p className="text-3xl font-bold text-purple-600">
                {promotionsReport?.premiumPromotions.total || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Revenue de Promociones</p>
              <p className="text-3xl font-bold text-green-600">
                ${promotionsReport?.premiumPromotions.totalRevenue.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Promedio por Promoción</p>
              <p className="text-3xl font-bold">
                ${promotionsReport?.premiumPromotions.averageRevenue.toFixed(2) || 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">Campaigns por Tipo</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={campaignsByTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {campaignsByTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">Estado de Promociones Premium</h3>
              <div className="space-y-4">
                {Object.entries(promotionsReport?.premiumPromotions.byStatus || {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-gray-700 capitalize">{status}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{
                            width: `${(count / (promotionsReport?.premiumPromotions.total || 1)) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold w-12 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* INVENTARIO */}
        <div className="mb-8 page-break">
          <h2 className="text-2xl font-bold mb-4">🚗 Inventario</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Total de Vehículos</p>
              <p className="text-3xl font-bold">{platformReport?.inventory.total || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Disponibles</p>
              <p className="text-3xl font-bold text-green-600">
                {platformReport?.inventory.byStatus.available || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Vendidos</p>
              <p className="text-3xl font-bold text-blue-600">
                {platformReport?.inventory.byStatus.sold || 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">Vehículos por Estado</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={inventoryByStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">Vehículos por Condición</h3>
              <div className="space-y-4">
                {Object.entries(platformReport?.inventory.byCondition || {}).map(([condition, count]) => (
                  <div key={condition} className="flex items-center justify-between">
                    <span className="text-gray-700 capitalize">{condition}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{
                            width: `${(count / (platformReport?.inventory.total || 1)) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold w-12 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* OTROS DATOS */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">📈 Otras Métricas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Total de Citas</p>
                  <p className="text-3xl font-bold">{platformReport?.appointments.total || 0}</p>
                </div>
                <div className="text-4xl">📅</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Pre-Cualificaciones</p>
                  <p className="text-3xl font-bold">{platformReport?.preQualifications.total || 0}</p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Posts en Redes</p>
                  <p className="text-3xl font-bold">{platformReport?.socialPosts.total || 0}</p>
                </div>
                <div className="text-4xl">📱</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Total de Reseñas</p>
                  <p className="text-3xl font-bold">{platformReport?.reviews.total || 0}</p>
                </div>
                <div className="text-4xl">⭐</div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Rating Promedio: {platformReport?.reviews.averageRating.toFixed(1) || 0}/5
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Archivos de Clientes</p>
                  <p className="text-3xl font-bold">{platformReport?.customerFiles.total || 0}</p>
                </div>
                <div className="text-4xl">📁</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Total de Leads</p>
                  <p className="text-3xl font-bold">{leadsReport?.total || 0}</p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Conversión: {leadsReport?.conversionRate.toFixed(1) || 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Footer del Reporte */}
        <div className="border-t pt-6 mt-8">
          <div className="text-center text-gray-500 text-sm">
            <p>Reporte generado el {new Date().toLocaleDateString()} a las {new Date().toLocaleTimeString()}</p>
            <p className="mt-2">AutoDealers Platform - Sistema de Gestión Integral</p>
          </div>
        </div>
      </div>
    </>
  );
}
