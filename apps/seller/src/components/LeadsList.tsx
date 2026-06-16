'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Lead } from '@autodealers/crm';
import { LeadRowExtras } from '@/components/LeadProfileSections';
import { useRealtimeLeads } from '@/hooks/useRealtimeLeads';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export default function LeadsList() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    source: searchParams.get('source') || '',
    search: searchParams.get('q') || '',
  });

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) {
      setFilters((f) => ({ ...f, status }));
    }
  }, [searchParams]);

  useEffect(() => {
    import('@/lib/current-seller-user')
      .then(({ loadCurrentSellerUser }) => loadCurrentSellerUser())
      .then((u) => {
        if (u) setUser(u);
      })
      .catch((err) => console.error('Error fetching user:', err));
  }, []);

  const { leads, loading, error } = useRealtimeLeads({
    tenantId: user?.tenantId,
    assignedTo: user?.id,
    independentWorkspace: user?.isIndependentWorkspace,
    status: filters.status || undefined,
    search: filters.search || undefined,
  });

  async function handleDeleteLead(leadId: string, leadName: string) {
    if (
      !window.confirm(
        `¿Eliminar permanentemente a ${leadName}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setDeletingId(leadId);
    try {
      const res = await fetchWithAuth(`/api/leads/${leadId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'No se pudo eliminar');
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      new: 'bg-primary-100 text-primary-700',
      contacted: 'bg-yellow-100 text-yellow-700',
      qualified: 'bg-green-100 text-green-700',
      appointment: 'bg-primary-100 text-primary-700',
      closed: 'bg-gray-100 text-gray-700',
      lost: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Buscar: nombre, teléfono, email, interés, trade-in, stock…"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
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
            <option value="appointment">Cita</option>
            <option value="closed">Cerrado</option>
            <option value="lost">Perdido</option>
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
            <option value="instagram">Instagram</option>
            <option value="email">Email</option>
            <option value="phone">Teléfono</option>
          </select>
          <div className="flex items-center">
            <span className="text-sm text-gray-600">
              {leads.length} lead{leads.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="divide-y">
        {leads.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No hay leads que mostrar
          </div>
        ) : (
          leads.map((lead) => (
            <div key={lead.id} className="flex items-stretch">
              <Link
                href={`/leads/${lead.id}`}
                className="block min-w-0 flex-1 p-4 transition hover:bg-gray-50"
              >
                <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-bold text-lg">
                      {lead.contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{lead.contact.name}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>{lead.contact.phone}</span>
                      {lead.contact.email && <span>{lead.contact.email}</span>}
                      <span className="capitalize">{lead.source}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(
                        lead.status
                      )}`}
                    >
                      {lead.status === 'new'
                        ? 'Nuevo'
                        : lead.status === 'contacted'
                        ? 'Contactado'
                        : lead.status === 'qualified'
                        ? 'Calificado'
                        : lead.status === 'appointment'
                        ? 'Cita'
                        : lead.status === 'closed'
                        ? 'Cerrado'
                        : 'Perdido'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {(() => {
                        let date: Date;
                        if (lead.createdAt instanceof Date) {
                          date = lead.createdAt;
                        } else if (lead.createdAt && typeof lead.createdAt === 'object' && 'toDate' in lead.createdAt) {
                          date = (lead.createdAt as any).toDate();
                        } else {
                          date = new Date(lead.createdAt as string | number);
                        }
                        return date.toLocaleDateString();
                      })()}
                    </p>
                  </div>
                </div>
              </div>
              <LeadRowExtras lead={lead as unknown as Lead} />
              </div>
              </Link>
              <div className="flex shrink-0 flex-col justify-center gap-1 border-l border-gray-100 bg-white px-2 py-2">
                <button
                  type="button"
                  className="rounded-md border border-red-200 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  disabled={deletingId === lead.id}
                  onClick={() => handleDeleteLead(lead.id, lead.contact.name || 'Cliente')}
                >
                  {deletingId === lead.id ? '…' : 'Eliminar'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}





