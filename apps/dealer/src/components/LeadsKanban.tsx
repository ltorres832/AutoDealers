'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Lead, LeadStatus, computeLeadSlaSeverity, formatHoursSinceTouch, DEFAULT_CRM_SLA, type CrmSlaConfig } from '@autodealers/crm';
import type { CrmPipelineSettings } from '@autodealers/core';
import { useRealtimeLeads } from '@/hooks/useRealtimeLeads';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { LeadKanbanFootnote } from '@/components/LeadProfileSections';
import { LeadAssignmentModal } from '@/components/LeadAssignmentModal';

interface LeadsKanbanProps {
  tenantId: string;
  /** Roles concesionario (gerente/admin) pueden reasignar y cargar SLA guardado */
  canReassign?: boolean;
}

type KanbanColumn = { status: LeadStatus; label: string; color: string };

const FALLBACK_COLUMNS: KanbanColumn[] = [
  { status: 'new', label: 'Nuevos', color: 'bg-blue-50 border-blue-200' },
  { status: 'contacted', label: 'Contactados', color: 'bg-yellow-50 border-yellow-200' },
  { status: 'qualified', label: 'Calificados', color: 'bg-green-50 border-green-200' },
  { status: 'pre_qualified', label: 'Pre-Calificados', color: 'bg-purple-50 border-purple-200' },
  { status: 'appointment', label: 'Citas', color: 'bg-indigo-50 border-indigo-200' },
  { status: 'test_drive', label: 'Pruebas', color: 'bg-pink-50 border-pink-200' },
  { status: 'negotiation', label: 'Negociación', color: 'bg-orange-50 border-orange-200' },
  { status: 'closed', label: 'Cerrados', color: 'bg-gray-50 border-gray-200' },
  { status: 'lost', label: 'Perdidos', color: 'bg-red-50 border-red-200' },
];

const COLOR_KEY_TO_TAILWIND: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200',
  yellow: 'bg-yellow-50 border-yellow-200',
  green: 'bg-green-50 border-green-200',
  purple: 'bg-purple-50 border-purple-200',
  indigo: 'bg-indigo-50 border-indigo-200',
  pink: 'bg-pink-50 border-pink-200',
  orange: 'bg-orange-50 border-orange-200',
  gray: 'bg-gray-50 border-gray-200',
  red: 'bg-red-50 border-red-200',
};

function pipelineToColumns(settings: CrmPipelineSettings | null): KanbanColumn[] {
  if (!settings?.enabled || !settings.stages?.length) {
    return FALLBACK_COLUMNS;
  }
  return [...settings.stages]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      status: s.status as LeadStatus,
      label: s.label,
      color: COLOR_KEY_TO_TAILWIND[s.color] || COLOR_KEY_TO_TAILWIND.gray,
    }));
}

export default function LeadsKanban({ tenantId, canReassign = false }: LeadsKanbanProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [columns, setColumns] = useState<KanbanColumn[]>(FALLBACK_COLUMNS);
  const [sla, setSla] = useState<CrmSlaConfig>(DEFAULT_CRM_SLA);
  const [reassignLead, setReassignLead] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchWithAuth('/api/settings/crm-pipeline')
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<CrmPipelineSettings>;
      })
      .then((data) => {
        if (cancelled || !data) return;
        setColumns(pipelineToColumns(data));
      })
      .catch(() => {
        if (!cancelled) setColumns(FALLBACK_COLUMNS);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!canReassign) return;
    void fetchWithAuth('/api/settings/crm-sla', {}).then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      if (data.config) setSla(data.config as CrmSlaConfig);
    });
  }, [canReassign]);

  const slaCounts = useMemo(() => {
    let warning = 0;
    let critical = 0;
    for (const lead of leads) {
      const sev = computeLeadSlaSeverity(lead, sla);
      if (sev === 'warning') warning++;
      if (sev === 'critical') critical++;
    }
    return { warning, critical, total: warning + critical };
  }, [leads, sla]);

  const { leads: realtimeLeads, loading: leadsLoading } = useRealtimeLeads({
    tenantId,
  });

  useEffect(() => {
    setLeads(realtimeLeads as unknown as Lead[]);
    setLoading(leadsLoading);
  }, [realtimeLeads, leadsLoading]);

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    
    if (!draggedLead || draggedLead.status === newStatus) {
      setDraggedLead(null);
      return;
    }

    try {
      // Actualizar estado optimísticamente
      setLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === draggedLead.id ? { ...lead, status: newStatus } : lead
        )
      );

      // Actualizar en backend
      const res = await fetchWithAuth(`/api/leads/${draggedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || res.statusText);
      }

      setDraggedLead(null);
    } catch (error) {
      console.error('Error updating lead status:', error);
      // Revertir cambio optimista
      setLeads(realtimeLeads as unknown as Lead[]);
      alert('Error al actualizar el estado del lead');
    }
  };

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter(lead => lead.status === status);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-600 font-bold';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  function slaCardRing(lead: Lead) {
    const sev = computeLeadSlaSeverity(lead, sla);
    if (!sla.enabled || sev === 'ok') return '';
    if (sev === 'critical') return 'ring-2 ring-red-500 bg-red-50/40';
    return 'ring-2 ring-amber-400 bg-amber-50/40';
  }

  function slaBadge(lead: Lead) {
    const sev = computeLeadSlaSeverity(lead, sla);
    if (!sla.enabled || sev === 'ok') return null;
    const label = sev === 'critical' ? 'SLA crítico' : 'SLA';
    const cls = sev === 'critical' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white';
    return (
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
        {label} · {formatHoursSinceTouch(lead)}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      {sla.enabled && slaCounts.total > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>SLA:</strong>{' '}
          {slaCounts.critical > 0 && (
            <span>
              {slaCounts.critical} en <span className="font-semibold text-red-700">crítico</span>
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
            Umbrales
          </Link>
        </div>
      )}
      <div className="flex gap-4 min-w-max">
        {columns.map((column) => {
          const columnLeads = getLeadsByStatus(column.status);
          
          return (
            <div
              key={column.status}
              className={`flex-shrink-0 w-80 rounded-lg border-2 ${column.color} p-4`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status)}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">
                  {column.label}
                </h3>
                <span className="bg-white px-2 py-1 rounded-full text-sm font-medium">
                  {columnLeads.length}
                </span>
              </div>

              <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                {columnLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => handleDragStart(lead)}
                    className={`rounded-lg p-4 shadow-sm transition-shadow cursor-move hover:shadow-md bg-white ${slaCardRing(lead)}`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h4 className="min-w-0 font-medium text-gray-900">{lead.contact.name}</h4>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {slaBadge(lead)}
                        {lead.score && (
                          <span className={`text-xs font-semibold ${getScoreColor(lead.score.combined)}`}>
                            {lead.score.combined}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500">{lead.contact.phone}</span>
                      {lead.aiClassification?.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(lead.aiClassification.priority)}`}>
                          {lead.aiClassification.priority}
                        </span>
                      )}
                    </div>

                    {lead.tags && lead.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {lead.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{lead.source}</span>
                      <span>{new Date(lead.updatedAt).toLocaleDateString()}</span>
                    </div>

                    <LeadKanbanFootnote lead={lead} />
                    <Link
                      href={`/leads/${lead.id}`}
                      className="mt-2 inline-block text-xs font-medium text-primary-600 hover:underline"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      Ver ficha completa del lead →
                    </Link>

                    {lead.assignedTo && (
                      <div className="mt-2 text-xs text-gray-500">
                        Asignado a: {lead.assignedTo}
                      </div>
                    )}

                    {canReassign && (
                      <button
                        type="button"
                        className="mt-2 w-full rounded border border-primary-200 px-2 py-1 text-xs font-medium text-primary-800 hover:bg-primary-50"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setReassignLead({
                            id: lead.id,
                            name: lead.contact.name || 'Cliente',
                          });
                        }}
                      >
                        Reasignar
                      </button>
                    )}
                  </div>
                ))}

                {columnLeads.length === 0 && (
                  <div className="text-center text-gray-400 py-8 text-sm">
                    No hay leads en esta etapa
                  </div>
                )}
              </div>
            </div>
          );
        })}
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

