'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SellerActivity {
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  stats: {
    totalLeads: number;
    activeLeads: number;
    totalSales: number;
    totalRevenue: number;
    totalAppointments: number;
    totalCampaigns: number;
  };
  recentLeads: any[];
  recentSales: any[];
  recentAppointments: any[];
  recentCampaigns: any[];
}

export default function SellersActivityPage() {
  const [activities, setActivities] = useState<SellerActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null);
  const [selectedDealer, setSelectedDealer] = useState<string | null>(null);
  const [availableDealers, setAvailableDealers] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchAvailableDealers();
    fetchSellersActivity();
  }, []);

  useEffect(() => {
    fetchSellersActivity();
  }, [selectedDealer]);

  async function fetchAvailableDealers() {
    try {
      const response = await fetch('/api/dealers');
      if (response.ok) {
        const data = await response.json();
        setAvailableDealers(data.dealers || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function fetchSellersActivity() {
    setLoading(true);
    try {
      const url = selectedDealer 
        ? `/api/sellers/activity?dealerId=${selectedDealer}`
        : '/api/sellers/activity';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
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

  const filteredActivities = selectedSeller
    ? activities.filter((a) => a.sellerId === selectedSeller)
    : activities;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Actividad de Vendedores</h1>
        <p className="text-gray-600 mt-2">
          Visualiza toda la actividad de tus vendedores: leads, citas, campañas y más
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableDealers.length > 1 && (
          <div>
            <label className="block text-sm font-medium mb-2">Filtrar por dealer</label>
            <select
              value={selectedDealer || ''}
              onChange={(e) => setSelectedDealer(e.target.value || null)}
              className="w-full border rounded px-4 py-2"
            >
              <option value="">Todos los dealers</option>
              {availableDealers.map((dealer) => (
                <option key={dealer.id} value={dealer.id}>
                  {dealer.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-2">Filtrar por vendedor</label>
          <select
            value={selectedSeller || ''}
            onChange={(e) => setSelectedSeller(e.target.value || null)}
            className="w-full border rounded px-4 py-2"
          >
            <option value="">Todos los vendedores</option>
            {activities.map((activity) => (
              <option key={activity.sellerId} value={activity.sellerId}>
                {activity.sellerName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumen general */}
      {!selectedSeller && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Total Leads</p>
            <p className="text-3xl font-bold">
              {activities.reduce((sum, a) => sum + a.stats.totalLeads, 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Total Ventas</p>
            <p className="text-3xl font-bold">
              {activities.reduce((sum, a) => sum + a.stats.totalSales, 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Revenue Total</p>
            <p className="text-3xl font-bold">
              ${activities.reduce((sum, a) => sum + a.stats.totalRevenue, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Citas Totales</p>
            <p className="text-3xl font-bold">
              {activities.reduce((sum, a) => sum + a.stats.totalAppointments, 0)}
            </p>
          </div>
        </div>
      )}

      {/* Actividad por vendedor */}
      <div className="space-y-6">
        {filteredActivities.map((activity) => (
          <div key={activity.sellerId} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{activity.sellerName}</h2>
                <p className="text-gray-600">{activity.sellerEmail}</p>
              </div>
              <Link
                href={`/sellers/${activity.sellerId}`}
                className="text-primary-600 hover:text-primary-700"
              >
                Ver Perfil →
              </Link>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Leads</p>
                <p className="text-2xl font-bold">{activity.stats.totalLeads}</p>
                <p className="text-xs text-green-600">{activity.stats.activeLeads} activos</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Ventas</p>
                <p className="text-2xl font-bold">{activity.stats.totalSales}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="text-2xl font-bold">${activity.stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Citas</p>
                <p className="text-2xl font-bold">{activity.stats.totalAppointments}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Campañas</p>
                <p className="text-2xl font-bold">{activity.stats.totalCampaigns}</p>
              </div>
            </div>

            {/* Leads Recientes */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Leads Recientes</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Cliente</th>
                      <th className="px-4 py-2 text-left">Vehículo</th>
                      <th className="px-4 py-2 text-left">Estado</th>
                      <th className="px-4 py-2 text-left">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.recentLeads.slice(0, 5).map((lead: any) => (
                      <tr key={lead.id} className="border-t">
                        <td className="px-4 py-2">{lead.contact?.name || 'Sin nombre'}</td>
                        <td className="px-4 py-2">{lead.vehicle?.name || 'N/A'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                            lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-700' :
                            lead.status === 'qualified' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {activity.recentLeads.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-center text-gray-500">
                          No hay leads
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ventas Recientes */}
            {activity.recentSales.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Ventas Recientes</h3>
                <div className="space-y-2">
                  {activity.recentSales.slice(0, 3).map((sale: any) => (
                    <div key={sale.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{sale.vehicle?.name || 'Vehículo'}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(sale.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="font-bold text-green-600">${(sale.price || sale.salePrice || sale.total || 0)?.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Citas Recientes */}
            {activity.recentAppointments.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Citas Recientes</h3>
                <div className="space-y-2">
                  {activity.recentAppointments.slice(0, 3).map((apt: any) => (
                    <div key={apt.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{apt.vehicle?.name || 'Cita'}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(apt.date).toLocaleDateString()} {apt.time}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                        apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredActivities.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600">No hay actividad de vendedores para mostrar</p>
          </div>
        )}
      </div>
    </div>
  );
}

