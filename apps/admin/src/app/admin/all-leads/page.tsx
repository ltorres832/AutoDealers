'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Lead {
  id: string;
  tenantId: string;
  tenantName?: string;
  contact: {
    name: string;
    phone: string;
    email?: string;
  };
  source: string;
  status: string;
  createdAt: string;
}

export default function AdminAllLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    tenantId: '',
    status: '',
    source: '',
    search: '',
  });

  useEffect(() => {
    fetchLeads();
  }, [filters]);

  async function fetchLeads() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/admin/all-leads?${params.toString()}`);
      const data = await response.json();
      setLeads(data.leads || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteLead(tenantId: string, leadId: string, leadName: string) {
    if (
      !window.confirm(
        `¿Eliminar permanentemente a ${leadName}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setDeletingId(leadId);
    try {
      const response = await fetch(`/api/admin/leads/${tenantId}/${leadId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'No se pudo eliminar');
      }
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
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
          <h1 className="text-3xl font-bold mb-2">Todos los Leads</h1>
          <p className="text-gray-600">
            Vista y gestión de todos los leads de todos los tenants
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/all-leads/kanban"
            className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2"
          >
            <span>📋</span>
            Vista Kanban
          </Link>
          <Link
            href="/admin/leads/create"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <span>➕</span>
            Crear Lead
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Buscar..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Tenant ID..."
            value={filters.tenantId}
            onChange={(e) => setFilters({ ...filters, tenantId: e.target.value })}
            className="border rounded px-3 py-2"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="">Todos los estados</option>
            <option value="new">Nuevo</option>
            <option value="contacted">Contactado</option>
            <option value="qualified">Calificado</option>
            <option value="closed">Cerrado</option>
          </select>
          <select
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="">Todas las fuentes</option>
            <option value="web">Web</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="facebook">Facebook</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {leads.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">No hay leads registrados</p>
            <p className="text-gray-400 text-sm mt-2">Los leads aparecerán aquí cuando se creen</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fuente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">
                  {lead.tenantName || lead.tenantId}
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium">{lead.contact.name}</div>
                    <div className="text-sm text-gray-500">{lead.contact.phone}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm capitalize">{lead.source}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs">
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/admin/tenants/${lead.tenantId}`}
                      className="text-primary-600 hover:text-primary-700 text-sm"
                    >
                      Ver Tenant
                    </Link>
                    <button
                      type="button"
                      disabled={deletingId === lead.id}
                      onClick={() =>
                        handleDeleteLead(
                          lead.tenantId,
                          lead.id,
                          lead.contact?.name || 'Cliente'
                        )
                      }
                      className="text-left text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {deletingId === lead.id ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  </div>
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

