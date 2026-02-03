'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
}

function StatCard({ title, value, change, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <p className="text-sm text-green-600 mt-1">{change}</p>
          )}
        </div>
        {icon && <div className="text-primary-600">{icon}</div>}
      </div>
    </div>
  );
}

interface DashboardStatsProps {
  stats: {
    totalLeads: number;
    activeLeads: number;
    totalVehicles: number;
    availableVehicles: number;
    totalSales: number;
    monthlyRevenue: number;
    appointmentsToday: number;
    unreadMessages: number;
  };
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Leads"
        value={stats.totalLeads}
        change={`${stats.activeLeads} activos`}
      />
      <StatCard
        title="Vehículos"
        value={stats.totalVehicles}
        change={`${stats.availableVehicles} disponibles`}
      />
      <StatCard
        title="Ventas Totales"
        value={stats.totalSales}
      />
      <StatCard
        title="Revenue Mensual"
        value={`$${stats.monthlyRevenue.toLocaleString()}`}
      />
      <StatCard
        title="Citas Hoy"
        value={stats.appointmentsToday}
      />
      <StatCard
        title="Mensajes"
        value={stats.unreadMessages}
        change="sin leer"
      />
    </div>
  );
}

