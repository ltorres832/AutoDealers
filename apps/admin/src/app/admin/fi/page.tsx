'use client';

// Vista F&I para Admin
// Permite ver todas las solicitudes F&I de todos los tenants

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface FIRequest {
  id: string;
  tenantId: string;
  clientId: string;
  status: string;
  employment: any;
  creditInfo: any;
  personalInfo: any;
  submittedAt?: string;
  reviewedAt?: string;
  createdBy: string;
}

interface Tenant {
  id: string;
  name: string;
}

export default function AdminFIPage() {
  const [requests, setRequests] = useState<FIRequest[]>([]);
  const [tenants, setTenants] = useState<Record<string, Tenant>>({});
  const [loading, setLoading] = useState(true);
  const [filterTenantId, setFilterTenantId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [filterTenantId, filterStatus]);

  const fetchData = async () => {
    try {
      let url = '/api/fi/requests';
      const params = new URLSearchParams();
      if (filterTenantId !== 'all') {
        params.append('tenantId', filterTenantId);
      }
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);

        // Obtener información de tenants únicos
        const uniqueTenantIds = [...new Set(data.requests.map((r: FIRequest) => r.tenantId))].filter((id): id is string => typeof id === 'string');
        const tenantsMap: Record<string, Tenant> = {};
        
        for (const tenantId of uniqueTenantIds) {
          try {
            const tenantResponse = await fetch(`/api/admin/tenants/${tenantId}`);
            if (tenantResponse.ok) {
              const tenantData = await tenantResponse.json();
              tenantsMap[tenantId] = tenantData.tenant;
            }
          } catch (error: any) {
            console.error(`Error fetching tenant ${tenantId}:`, error);
          }
        }
        
        setTenants(tenantsMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      draft: { color: 'bg-gray-500', label: 'Borrador' },
      submitted: { color: 'bg-blue-500', label: 'Enviado' },
      under_review: { color: 'bg-yellow-500', label: 'En Revisión' },
      pre_approved: { color: 'bg-green-500', label: 'Pre-Aprobado' },
      approved: { color: 'bg-green-600', label: 'Aprobado' },
      pending_info: { color: 'bg-orange-500', label: 'Pendiente Info' },
      rejected: { color: 'bg-red-500', label: 'Rechazado' },
    };

    const statusInfo = statusMap[status] || { color: 'bg-gray-500', label: status };
    return (
      <span className={`px-2 py-1 rounded text-xs text-white ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Módulo F&I - Vista Admin</h1>
            <p className="mt-2 text-gray-600">
              Vista completa de todas las solicitudes F&I de todos los tenants
            </p>
          </div>
          <Link
            href="/admin/fi/webhook-config"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
          >
            ⚙️ Configurar Webhook
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex space-x-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">Todos los Estados</option>
          <option value="draft">Borrador</option>
          <option value="submitted">Enviado</option>
          <option value="under_review">En Revisión</option>
          <option value="pre_approved">Pre-Aprobado</option>
          <option value="approved">Aprobado</option>
          <option value="pending_info">Pendiente Info</option>
          <option value="rejected">Rechazado</option>
        </select>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Solicitudes</div>
          <div className="text-2xl font-bold text-gray-900">{requests.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Pendientes</div>
          <div className="text-2xl font-bold text-blue-600">
            {requests.filter((r) => r.status === 'submitted' || r.status === 'under_review').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Aprobadas</div>
          <div className="text-2xl font-bold text-green-600">
            {requests.filter((r) => r.status === 'approved' || r.status === 'pre_approved').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Rechazadas</div>
          <div className="text-2xl font-bold text-red-600">
            {requests.filter((r) => r.status === 'rejected').length}
          </div>
        </div>
      </div>

      {/* Lista de Solicitudes */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ingreso Mensual
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Crédito
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((request) => (
              <tr key={request.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {tenants[request.tenantId]?.name || request.tenantId}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${request.employment?.monthlyIncome?.toLocaleString() || '0'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                  {request.creditInfo?.creditRange || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(request.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {request.submittedAt
                    ? new Date(request.submittedAt).toLocaleDateString()
                    : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    href={`/admin/tenants/${request.tenantId}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Ver Tenant
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {requests.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay solicitudes F&I</p>
          </div>
        )}
      </div>
    </div>
  );
}

