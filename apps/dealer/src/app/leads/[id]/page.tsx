'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { useAuth } from '@/hooks/useAuth';
import { isDealerPortalRole, isSellerRole } from '@/lib/dealer-portal-roles';
import { useRealtimeLead } from '@/hooks/useRealtimeLead';
import type { LeadStatus } from '@autodealers/crm';
import type { CrmPipelineSettings } from '@autodealers/core';
import { LeadFullProfile } from '@/components/LeadProfileSections';

const FALLBACK_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'qualified', label: 'Calificado' },
  { value: 'pre_qualified', label: 'Pre-calificado' },
  { value: 'appointment', label: 'Cita' },
  { value: 'test_drive', label: 'Prueba de manejo' },
  { value: 'negotiation', label: 'Negociación' },
  { value: 'closed', label: 'Cerrado' },
  { value: 'lost', label: 'Perdido' },
];

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id =
    typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const { lead, loading, error } = useRealtimeLead(user?.tenantId, id);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canDelete =
    isDealerPortalRole(user?.role) ||
    (isSellerRole(user?.role) && lead?.assignedTo === user?.id);
  const [statusOptions, setStatusOptions] = useState<{ value: LeadStatus; label: string }[]>(
    FALLBACK_STATUS_OPTIONS
  );

  useEffect(() => {
    let cancelled = false;
    fetchWithAuth('/api/settings/crm-pipeline')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CrmPipelineSettings | null) => {
        if (cancelled || !data?.stages?.length) return;
        setStatusOptions(
          [...data.stages]
            .sort((a, b) => a.order - b.order)
            .map((s) => ({ value: s.status as LeadStatus, label: s.label }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const statusSelectOptions = useMemo(() => {
    const m = new Map(statusOptions.map((s) => [s.value, s]));
    if (lead && !m.has(lead.status)) {
      m.set(lead.status, { value: lead.status, label: `${lead.status} (pipeline)` });
    }
    return [...m.values()];
  }, [statusOptions, lead]);

  async function onStatusChange(next: LeadStatus) {
    if (!lead || !id || next === lead.status) return;
    setStatusSaving(true);
    try {
      const res = await fetchWithAuth(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'No se pudo actualizar el estado');
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al actualizar');
    } finally {
      setStatusSaving(false);
    }
  }

  async function onDeleteLead() {
    if (!lead || !id || deleting) return;
    const name = lead.contact?.name || 'este lead';
    if (
      !window.confirm(
        `¿Eliminar permanentemente a ${name}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/leads/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'No se pudo eliminar el lead');
      }
      router.push('/leads');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  }

  if (!id) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-gray-600">
        Lead no especificado.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/leads" className="text-primary-600 hover:underline text-sm">
          ← Volver a leads
        </Link>
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3">
          {error || 'Lead no encontrado'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pb-16">
      <div className="mb-6">
        <Link href="/leads" className="text-sm text-primary-600 hover:underline">
          ← Volver a la lista de leads
        </Link>
      </div>

      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{lead.contact.name}</h1>
          <p className="text-gray-600 mt-1">
            {lead.contact.phone}
            {lead.contact.email ? ` · ${lead.contact.email}` : ''}
          </p>
          <p className="text-xs text-gray-400 mt-2 font-mono">ID: {lead.id}</p>
        </div>
        <div className="flex flex-col gap-2 min-w-[200px]">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estado en pipeline</label>
          <select
            value={lead.status}
            disabled={statusSaving}
            onChange={(e) => onStatusChange(e.target.value as LeadStatus)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm disabled:opacity-50"
          >
            {statusSelectOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {statusSaving ? <span className="text-xs text-gray-500">Guardando…</span> : null}
          {canDelete ? (
            <button
              type="button"
              onClick={onDeleteLead}
              disabled={deleting}
              className="mt-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? 'Eliminando…' : 'Eliminar lead'}
            </button>
          ) : null}
        </div>
      </header>

      <LeadFullProfile lead={lead} />
    </div>
  );
}
