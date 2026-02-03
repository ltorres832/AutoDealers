'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface PolicyAcceptance {
  id: string;
  policyId: string;
  policyTitle: string;
  policyVersion: string;
  acceptedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export default function PolicyHistoryPage() {
  const { auth } = useAuth();
  const [acceptances, setAcceptances] = useState<PolicyAcceptance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth?.userId) {
      fetchHistory();
    }
  }, [auth]);

  async function fetchHistory() {
    try {
      setLoading(true);
      const response = await fetch(`/api/policies/history?userId=${auth?.userId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAcceptances(data.acceptances || []);
      }
    } catch (error) {
      console.error('Error fetching policy history:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Historial de Aceptación de Políticas</h1>
        <p className="mt-2 text-gray-600">
          Registro de todas las políticas que has aceptado
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {acceptances.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No has aceptado ninguna política aún
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Política
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Versión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de Aceptación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {acceptances.map((acceptance) => (
                <tr key={acceptance.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {acceptance.policyTitle}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {acceptance.policyVersion}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(acceptance.acceptedAt).toLocaleString('es-ES')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {acceptance.ipAddress || 'N/A'}
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


