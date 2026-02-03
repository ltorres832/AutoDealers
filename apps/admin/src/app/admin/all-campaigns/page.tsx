'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Campaign {
  id: string;
  tenantId: string;
  tenantName?: string;
  name: string;
  type: string;
  platforms: string[];
  status: string;
  budgets: Array<{ platform: string; amount: number }>;
  metrics?: {
    impressions: number;
    clicks: number;
    leads: number;
    spend: number;
  };
  createdAt: string;
}

export default function AdminAllCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const response = await fetch('/api/admin/all-campaigns');
      const data = await response.json();
      setCampaigns(data.campaigns || []);
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
        <div>
          <h1 className="text-3xl font-bold">Todas las Campañas</h1>
          <p className="text-gray-600 mt-2">
            Vista de todas las campañas de todos los tenants
          </p>
        </div>
        <Link
          href="/admin/campaigns/create"
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
        >
          + Crear Campaña
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">No hay campañas registradas</p>
          <p className="text-gray-400 text-sm mt-2">Las campañas aparecerán aquí cuando se creen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{campaign.name}</h3>
                <p className="text-sm text-gray-600">{campaign.tenantName || campaign.tenantId}</p>
              </div>
              <span
                className={`px-3 py-1 rounded text-xs ${
                  campaign.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {campaign.status}
              </span>
            </div>

            <div className="mb-4">
              <div className="flex gap-2 flex-wrap">
                {campaign.platforms.map((platform) => (
                  <span
                    key={platform}
                    className="px-2 py-1 bg-gray-100 rounded text-xs capitalize"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            </div>

            {campaign.metrics && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Impresiones</p>
                  <p className="font-bold">{campaign.metrics.impressions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Clics</p>
                  <p className="font-bold">{campaign.metrics.clicks.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Leads</p>
                  <p className="font-bold">{campaign.metrics.leads}</p>
                </div>
                <div>
                  <p className="text-gray-500">Gastado</p>
                  <p className="font-bold">${campaign.metrics.spend.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
          ))}
        </div>
      )}
    </div>
  );
}

