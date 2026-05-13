'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { Lead } from '@autodealers/crm';
import {
  computeLeadSlaSeverity,
  formatHoursSinceTouch,
  DEFAULT_CRM_SLA,
  type CrmSlaConfig,
} from '@autodealers/crm';
import { LeadRowExtras } from '@/components/LeadProfileSections';
import { useRealtimeLeads } from '@/hooks/useRealtimeLeads';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { isDealerPortalRole } from '@/lib/dealer-portal-roles';
import { LeadAssignmentModal } from '@/components/LeadAssignmentModal';
import { getDealerActiveTenantId } from '@/lib/dealer-tenant-storage';

export default function LeadsList() {
  const [user, setUser] = useState<{ tenantId?: string; role?: string } | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    source: '',
    search: '',
  });
  const [sla, setSla] = useState<CrmSlaConfig>(DEFAULT_CRM_SLA);
  const [reassignLead, setReassignLead] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    void fetchWithAuth('/api/user', {})
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch((err) => console.error('Error fetching user:', err));
  }, []);

  useEffect(() => {
    const tid = getDealerActiveTenantId(user?.tenantId ?? null);
    if (!tid || !isDealerPortalRole(user?.role)) return;
    void fetchWithAuth('/api/settings/crm-sla', {}).then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      if (data.config) setSla(data.config as CrmSlaConfig);
    });
  }, [user]);

  const { leads, loading } = useRealtimeLeads({
    tenantId: getDealerActiveTenantId(user?.tenantId ?? null),
    status: filters.status || undefined,
    source: filters.source || undefined,
    search: filters.search || undefined,
  });

  const canReassign = user?.role && isDealerPortalRole(user.role);

  const slaCounts = useMemo(() => {
    let warning = 0;
    let critical = 0;
    for (const lead of leads) {
      const sev = computeLeadSlaSeverity(lead as unknown as Lead, sla);
      if (sev === 'warning') warning++;
      if (sev === 'critical') critical++;
    }
    return { warning, critical, total: warning + critical };
  }, [leads, sla]);

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-700',
      contacted: 'bg-yellow-100 text-yellow-700',
      qualified: 'bg-green-100 text-green-700',
      appointment: 'bg-purple-100 text-purple-700',
      closed: 'bg-gray-100 text-gray-700',
      lost: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  }

  function slaRowClass(lead: (typeof leads)[0]) {
    const sev = computeLeadSlaSeverity(lead as unknown as Lead, sla);
    if (sev === 'critical') return 'border-l-4 border-red-500 bg-red-50/40';
    if (sev === 'warning') return 'border-l-4 border-amber-400 bg-amber-50/40';
    return '';
  }

  function slaBadge(lead: (typeof leads)[0]) {
    const sev = computeLeadSlaSeverity(lead as unknown as Lead, sla);
    if (!sla.enabled || sev === 'ok') return null;
    const label = sev === 'critical' ? 'SLA crítico' : 'SLA';
    const cls =
      sev === 'critical' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white';
    return (
      <span className={`ml-2 inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>
        {label} · {formatHoursSinceTouch(lead as unknown as Lead)}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white shadow">
      {sla.enabled && slaCounts.total > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Atención:</strong> {slaCounts.critical > 0 && (
            <span>
              {slaCounts.critical} lead(s) en <span className="font-semibold text-red-700">SLA crítico</span>
              {slaCounts.warning > 0 ? ' · ' : ''}
            </span>
          )}
          {slaCounts.warning > 0 && (
            <span>
              {slaCounts.warning} en <span className="font-semibold">advertencia</span>
            </span>
          )}
          .{' '}
          <Link href="/settings/crm-sla" className="font-medium text-primary-700 underline">
            Ajustar umbrales
          </Link>
        </div>
      )}

      <div className="border-b bg-gray-50 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <input
            type="text"
            placeholder="Buscar: nombre, teléfono, email, interés, trade-in, stock…"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="rounded border px-3 py-2"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="rounded border px-3 py-2"
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
            className="rounded border px-3 py-2"
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
          <div className="p-12 text-center text-gray-500">No hay leads que mostrar</div>
        ) : (
          leads.map((lead) => (
            <div key={lead.id} className={`flex items-stretch ${slaRowClass(lead)}`}>
              <Link href={`/leads/${lead.id}`} className="block min-w-0 flex-1 p-4 transition hover:bg-gray-50">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-1 items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                        <span className="text-lg font-bold text-primary-600">
                          {lead.contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <h3 className="text-lg font-bold">{lead.contact.name}</h3>
                          {slaBadge(lead)}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <span>{lead.contact.phone}</span>
                          {lead.contact.email && <span>{lead.contact.email}</span>}
                          <span className="capitalize">{lead.source}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`rounded px-3 py-1 text-sm font-medium ${getStatusColor(lead.status)}`}
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
                        <p className="mt-1 text-xs text-gray-500">
                          {(() => {
                            const createdAt = lead.createdAt;
                            if (createdAt instanceof Date) {
                              return createdAt.toLocaleDateString();
                            }
                            if (createdAt && typeof createdAt === 'object' && 'toDate' in createdAt) {
                              return (createdAt as { toDate: () => Date }).toDate().toLocaleDateString();
                            }
                            if (typeof createdAt === 'string' || typeof createdAt === 'number') {
                              return new Date(createdAt).toLocaleDateString();
                            }
                            return 'N/A';
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <LeadRowExtras lead={lead as unknown as Lead} />
                </div>
              </Link>
              {canReassign && (
                <div className="flex shrink-0 flex-col justify-center border-l border-gray-100 bg-white px-2 py-2">
                  <button
                    type="button"
                    className="rounded-md border border-primary-200 px-2 py-1.5 text-xs font-medium text-primary-800 hover:bg-primary-50"
                    onClick={() =>
                      setReassignLead({ id: lead.id, name: lead.contact.name || 'Cliente' })
                    }
                  >
                    Reasignar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {reassignLead && (
        <LeadAssignmentModal
          leadId={reassignLead.id}
          leadName={reassignLead.name}
          onClose={() => setReassignLead(null)}
          onSuccess={() => setReassignLead(null)}
        />
      )}
    </div>
  );
}
