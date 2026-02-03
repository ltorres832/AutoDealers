'use client';

import DashboardStats from '@/components/DashboardStats';
import RecentActivity from '@/components/RecentActivity';
import QuickActions from '@/components/QuickActions';
import Link from 'next/link';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeIndicator } from '@/components/RealtimeIndicator';

export default function DashboardPage() {
  const { auth } = useAuth();
  const { stats, recentLeads, recentSales, loading } = useRealtimeDashboard(auth?.tenantId);

  const data = {
    stats,
    recentLeads,
    recentSales,
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data) {
    return <div>Error al cargar datos</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Vista general de tu negocio en tiempo real
            </p>
          </div>
          <RealtimeIndicator isActive={!loading && auth?.tenantId !== undefined} />
        </div>
      </div>

      <DashboardStats stats={data.stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <RecentActivity
            leads={data.recentLeads}
            sales={data.recentSales}
          />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
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
          href="/campaigns"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">📢</div>
          <p className="font-medium">Campañas</p>
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
        <Link
          href="/settings/integrations"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-2">🔗</div>
          <p className="font-medium">Integraciones</p>
        </Link>
      </div>
    </div>
  );
}
