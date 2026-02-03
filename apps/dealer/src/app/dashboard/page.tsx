'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardData {
  stats: {
    totalLeads: number;
    activeLeads: number;
    totalVehicles: number;
    availableVehicles: number;
    totalSales: number;
    monthlyRevenue: number;
    appointmentsToday: number;
    unreadMessages: number;
    totalSellers: number;
    sellersSales: number;
  };
  recentLeads: any[];
  recentSales: any[];
  topSellers: Array<{ id: string; name: string; sales: number; revenue: number }>;
}

const emptyData: DashboardData = {
  stats: {
    totalLeads: 0,
    activeLeads: 0,
    totalVehicles: 0,
    availableVehicles: 0,
    totalSales: 0,
    monthlyRevenue: 0,
    appointmentsToday: 0,
    unreadMessages: 0,
    totalSellers: 0,
    sellersSales: 0,
  },
  recentLeads: [],
  recentSales: [],
  topSellers: [],
};

export default function DealerDashboardPage() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [membershipInfo, setMembershipInfo] = useState<any>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [profileInfo, setProfileInfo] = useState<any>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        // Usar fetchWithAuth que automáticamente renueva el token
        const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
        const response = await fetchWithAuth('/api/dashboard', {});
        
        if (response.ok) {
          const dashboardData = await response.json();
          
          if (dashboardData.stats) {
            setData({
              stats: {
                totalLeads: dashboardData.stats.totalLeads || 0,
                activeLeads: dashboardData.stats.activeLeads || 0,
                totalVehicles: dashboardData.stats.totalVehicles || 0,
                availableVehicles: dashboardData.stats.availableVehicles || 0,
                totalSales: dashboardData.stats.totalSales || 0,
                monthlyRevenue: dashboardData.stats.monthlyRevenue || 0,
                appointmentsToday: dashboardData.stats.appointmentsToday || 0,
                unreadMessages: dashboardData.stats.unreadMessages || 0,
                totalSellers: dashboardData.stats.totalSellers || 0,
                sellersSales: dashboardData.stats.sellersSales || 0,
              },
              recentLeads: dashboardData.recentLeads || [],
              recentSales: dashboardData.recentSales || [],
              topSellers: dashboardData.topSellers || [],
            });
          }
        }
      } catch (error) {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
    
    async function fetchMembershipInfo() {
      try {
        const [membershipRes, subscriptionRes] = await Promise.all([
          fetch('/api/settings/membership'),
          fetch('/api/settings/membership/subscription'),
        ]);

        if (membershipRes.ok) {
          const membershipData = await membershipRes.json();
          setMembershipInfo(membershipData.membership);
        }

        if (subscriptionRes.ok) {
          const subscriptionData = await subscriptionRes.json();
          setSubscriptionInfo(subscriptionData.subscription);
        }
      } catch (error) {
        // Silently handle
      }
    }

    async function fetchProfileInfo() {
      try {
        const response = await fetch('/api/settings/profile');
        if (response.ok) {
          const data = await response.json();
          setProfileInfo(data.profile);
        }
      } catch (error) {
        // Silently handle
      }
    }

    fetchMembershipInfo();
    fetchProfileInfo();
  }, []);

  function getStatusColor(status: string) {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'past_due':
      case 'unpaid':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'suspended':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      active: 'Activa',
      past_due: 'Pago Pendiente',
      cancelled: 'Cancelada',
      suspended: 'Suspendida',
      trialing: 'En Prueba',
      unpaid: 'No Pagado',
    };
    return labels[status] || status;
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Dealer</h1>
            <p className="text-gray-600 mt-2">
              Vista general de tu negocio y todos tus vendedores
            </p>
          </div>
          {profileInfo && (profileInfo.dealerRating || 0) > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-2">Calificación del Dealer</div>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-2xl ${
                        star <= Math.round(profileInfo.dealerRating || 0)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <div className="ml-2">
                  <div className="text-xl font-bold text-gray-900">
                    {(profileInfo.dealerRating || 0).toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {profileInfo.dealerRatingCount || 0} calificación{profileInfo.dealerRatingCount !== 1 ? 'es' : ''}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {membershipInfo && subscriptionInfo && (
        <div className={`mb-6 p-4 rounded-lg border-2 ${getStatusColor(subscriptionInfo.status)}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-lg">Membresía: {membershipInfo.name}</h3>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/50">
                  {getStatusLabel(subscriptionInfo.status)}
                </span>
              </div>
              {subscriptionInfo.statusReason && (
                <p className="text-sm mt-1 opacity-90">
                  {subscriptionInfo.statusReason}
                </p>
              )}
              <p className="text-sm mt-1">
                Próximo pago: {new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
            <Link
              href="/settings/membership"
              className="px-4 py-2 bg-white/80 hover:bg-white rounded-lg font-medium text-sm transition-colors"
            >
              Gestionar Membresía
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Total de Leads</p>
          <p className="text-3xl font-bold text-gray-900">{data.stats.totalLeads}</p>
          <p className="text-sm text-green-600 mt-1">
            {data.stats.activeLeads} activos
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Vehículos en Inventario</p>
          <p className="text-3xl font-bold text-gray-900">{data.stats.totalVehicles}</p>
          <p className="text-sm text-blue-600 mt-1">
            {data.stats.availableVehicles} disponibles
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Ventas Totales</p>
          <p className="text-3xl font-bold text-gray-900">{data.stats.totalSales}</p>
          <p className="text-sm text-gray-500 mt-1">
            {data.stats.sellersSales} por vendedores
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Revenue Mensual</p>
          <p className="text-3xl font-bold text-gray-900">
            ${data.stats.monthlyRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Vendedores Activos</p>
          <p className="text-3xl font-bold text-gray-900">{data.stats.totalSellers}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Citas Hoy</p>
          <p className="text-3xl font-bold text-gray-900">{data.stats.appointmentsToday}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Mensajes Sin Leer</p>
          <p className="text-3xl font-bold text-gray-900">{data.stats.unreadMessages}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Top Vendedores</h2>
          <div className="space-y-4">
            {data.topSellers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay vendedores</p>
            ) : (
              data.topSellers.map((seller, index) => (
                <div
                  key={seller.id}
                  className="flex items-center justify-between p-4 border rounded"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-bold">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{seller.name}</p>
                      <p className="text-sm text-gray-500">
                        {seller.sales} ventas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      ${seller.revenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Leads Recientes</h2>
            <Link
              href="/leads"
              className="text-primary-600 hover:text-primary-700 text-sm"
            >
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentLeads.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay leads</p>
            ) : (
              data.recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-sm text-gray-500">{lead.source}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      lead.status === 'new'
                        ? 'bg-blue-100 text-blue-700'
                        : lead.status === 'qualified'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {lead.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Ventas Recientes</h2>
          <Link
            href="/sales"
            className="text-primary-600 hover:text-primary-700 text-sm"
          >
            Ver todas
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vehículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.recentSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No hay ventas
                  </td>
                </tr>
              ) : (
                data.recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-6 py-4">{sale.vehicle}</td>
                    <td className="px-6 py-4">{sale.customerName}</td>
                    <td className="px-6 py-4">{sale.sellerName || '-'}</td>
                    <td className="px-6 py-4 font-medium">
                      ${((sale as any).price || (sale as any).salePrice || (sale as any).total || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/leads"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">👥</div>
          <p className="font-medium">Leads</p>
        </Link>
        <Link
          href="/inventory"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">🚗</div>
          <p className="font-medium">Inventario</p>
        </Link>
        <Link
          href="/sellers"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">👨‍💼</div>
          <p className="font-medium">Vendedores</p>
        </Link>
        <Link
          href="/campaigns"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">📢</div>
          <p className="font-medium">Campañas</p>
        </Link>
        <Link
          href="/appointments"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">📅</div>
          <p className="font-medium">Citas</p>
        </Link>
        <Link
          href="/messages"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">💬</div>
          <p className="font-medium">Mensajes</p>
        </Link>
        <Link
          href="/promotions"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">🎁</div>
          <p className="font-medium">Promociones</p>
        </Link>
        <Link
          href="/reports"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">📊</div>
          <p className="font-medium">Reportes</p>
        </Link>
      </div>
    </div>
  );
}
