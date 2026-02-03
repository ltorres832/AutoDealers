'use client';

import { useState, useEffect } from 'react';
import SocialIcon from '@/components/SocialIcon';

interface Integration {
  id: string;
  tenantId: string;
  tenantName?: string;
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'unknown';
  accountName: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export default function AdminAllIntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  async function fetchIntegrations() {
    try {
      const response = await fetch('/api/admin/all-integrations');
      const data = await response.json();
      setIntegrations(data.integrations || []);
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
      <h1 className="text-3xl font-bold mb-6">Todas las Integraciones</h1>
      <p className="text-gray-600 mb-6">
        Vista de todas las integraciones de redes sociales de todos los tenants
      </p>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {integrations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg font-medium">No hay integraciones registradas</p>
            <p className="text-gray-400 text-sm mt-2">
              Las integraciones aparecerán aquí cuando los dealers o vendedores configuren sus conexiones de redes sociales
            </p>
            <p className="text-gray-400 text-xs mt-4">
              Tipos soportados: Facebook, Instagram, WhatsApp
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Plataforma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cuenta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {integrations.map((integration) => (
              <tr key={integration.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">
                  {integration.tenantName || integration.tenantId}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <SocialIcon platform={integration.platform as any} size={20} />
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      integration.platform === 'facebook'
                        ? 'bg-blue-50 text-blue-700'
                        : integration.platform === 'instagram'
                        ? 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700'
                        : integration.platform === 'whatsapp'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {integration.platform}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">{integration.accountName}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      integration.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : integration.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : integration.status === 'error'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {integration.status === 'active' && '✓ Activa'}
                    {integration.status === 'pending' && '⏳ Pendiente'}
                    {integration.status === 'error' && '✗ Error'}
                    {!['active', 'pending', 'error'].includes(integration.status) && integration.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(integration.createdAt).toLocaleDateString()}
                </td>
              </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

