'use client';

import Link from 'next/link';
import { useRealtimeAdminStats } from '@/hooks/useRealtimeAdmin';
import { RealtimeIndicator } from '@/components/RealtimeIndicator';

export default function AdminGlobalPage() {
  const { stats, loading } = useRealtimeAdminStats();

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Vista Global de la Plataforma</h1>
          <p className="text-gray-600 mt-2">
            Control total y visión en tiempo real de toda la plataforma
          </p>
        </div>
        <RealtimeIndicator isActive={!loading} label="Sincronizado en tiempo real" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Total de Usuarios</p>
          <p className="text-3xl font-bold">{stats.totalUsers}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Total de Tenants</p>
          <p className="text-3xl font-bold">{stats.totalTenants}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Total de Vehículos</p>
          <p className="text-3xl font-bold">{stats.totalVehicles}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Total de Leads</p>
          <p className="text-3xl font-bold">{stats.totalLeads}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Total de Ventas</p>
          <p className="text-3xl font-bold">{stats.totalSales}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Revenue Total</p>
          <p className="text-3xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Suscripciones Activas</p>
          <p className="text-3xl font-bold">{stats.activeSubscriptions}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Revenue Mensual</p>
          <p className="text-3xl font-bold">${stats.monthlyRevenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/admin/users"
            className="p-4 border rounded hover:bg-gray-50 text-center transition-colors"
          >
            <div className="text-2xl mb-2">👥</div>
            <p className="font-medium">Usuarios</p>
          </Link>
          <Link
            href="/admin/tenants"
            className="p-4 border rounded hover:bg-gray-50 text-center transition-colors"
          >
            <div className="text-2xl mb-2">🏢</div>
            <p className="font-medium">Tenants</p>
          </Link>
          <Link
            href="/admin/memberships"
            className="p-4 border rounded hover:bg-gray-50 text-center transition-colors"
          >
            <div className="text-2xl mb-2">💳</div>
            <p className="font-medium">Membresías</p>
          </Link>
          <Link
            href="/admin/reports"
            className="p-4 border rounded hover:bg-gray-50 text-center transition-colors"
          >
            <div className="text-2xl mb-2">📈</div>
            <p className="font-medium">Reportes</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

