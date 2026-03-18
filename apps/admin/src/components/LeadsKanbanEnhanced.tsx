'use client';

import { useState, useEffect, useMemo } from 'react';
import { Lead, LeadStatus } from '@autodealers/crm';
import { useRealtimeLeads } from '@/hooks/useRealtimeLeads';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

type RealtimeLead = ReturnType<typeof useRealtimeLeads>['leads'][0];

interface LeadsKanbanEnhancedProps {
  tenantId?: string;
  onLeadClick?: (lead: Lead | RealtimeLead) => void;
}

const STATUS_COLUMNS: { status: LeadStatus; label: string; color: string; bgColor: string }[] = [
  { status: 'new', label: 'Nuevos', color: 'border-blue-300', bgColor: 'bg-blue-50' },
  { status: 'contacted', label: 'Contactados', color: 'border-yellow-300', bgColor: 'bg-yellow-50' },
  { status: 'qualified', label: 'Calificados', color: 'border-green-300', bgColor: 'bg-green-50' },
  { status: 'pre_qualified', label: 'Pre-Calificados', color: 'border-purple-300', bgColor: 'bg-purple-50' },
  { status: 'appointment', label: 'Citas', color: 'border-indigo-300', bgColor: 'bg-indigo-50' },
  { status: 'test_drive', label: 'Pruebas', color: 'border-pink-300', bgColor: 'bg-pink-50' },
  { status: 'negotiation', label: 'Negociación', color: 'border-orange-300', bgColor: 'bg-orange-50' },
  { status: 'closed', label: 'Cerrados', color: 'border-gray-300', bgColor: 'bg-gray-50' },
  { status: 'lost', label: 'Perdidos', color: 'border-red-300', bgColor: 'bg-red-50' },
];

export default function LeadsKanbanEnhanced({ tenantId, onLeadClick }: LeadsKanbanEnhancedProps) {
  const { auth } = useAuth();
  const [filters, setFilters] = useState({
    source: '',
    search: '',
    assignedTo: '',
    priority: '',
  });
  const [wipLimits, setWipLimits] = useState<Record<LeadStatus, number>>({
    new: 0,
    contacted: 0,
    qualified: 0,
    pre_qualified: 0,
    appointment: 0,
    test_drive: 0,
    negotiation: 0,
    closed: 0,
    lost: 0,
  });
  const [showStaleAlerts, setShowStaleAlerts] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | RealtimeLead | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);

  // Usar hook de tiempo real
  const { leads, loading } = useRealtimeLeads({
    tenantId: tenantId || auth?.tenantId,
    source: filters.source || undefined,
    search: filters.search || undefined,
  });

  // Filtrar leads por prioridad si está seleccionado
  const filteredLeads = useMemo(() => {
    let filtered = leads;

    if (filters.priority) {
      filtered = filtered.filter(lead => 
        lead.aiClassification?.priority === filters.priority
      );
    }

    if (filters.assignedTo) {
      filtered = filtered.filter(lead => 
        lead.assignedTo === filters.assignedTo
      );
    }

    return filtered;
  }, [leads, filters]);

  // Detectar leads estancados (sin actualización en 7 días)
  const staleLeads = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return filteredLeads.filter(lead => {
      let updatedAt: Date;
      if (lead.updatedAt instanceof Date) {
        updatedAt = lead.updatedAt;
      } else if (lead.updatedAt && typeof lead.updatedAt === 'object' && 'toDate' in lead.updatedAt) {
        // Es un Timestamp de Firestore
        updatedAt = (lead.updatedAt as any).toDate();
      } else {
        // Convertir a unknown primero para evitar error de TypeScript
        updatedAt = new Date(lead.updatedAt as unknown as string | number);
      }
      return updatedAt < sevenDaysAgo && lead.status !== 'closed' && lead.status !== 'lost';
    });
  }, [filteredLeads]);

  const handleDragStart = (lead: Lead | ReturnType<typeof useRealtimeLeads>['leads'][0]) => {
    setDraggedLead(lead as Lead);
  };

  const handleDragOver = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedLead || draggedLead.status === newStatus) {
      setDraggedLead(null);
      return;
    }

    // Verificar límite WIP si está configurado
    const columnLeads = getLeadsByStatus(newStatus);
    const wipLimit = wipLimits[newStatus];
    if (wipLimit > 0 && columnLeads.length >= wipLimit) {
      alert(`Límite WIP alcanzado para ${STATUS_COLUMNS.find(c => c.status === newStatus)?.label}. Máximo: ${wipLimit}`);
      setDraggedLead(null);
      return;
    }

    try {
      // Actualizar en backend
      const response = await fetch(`/api/leads/${draggedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar estado');
      }

      setDraggedLead(null);
    } catch (error) {
      console.error('Error updating lead status:', error);
      alert('Error al actualizar el estado del lead');
      setDraggedLead(null);
    }
  };

  const getLeadsByStatus = (status: LeadStatus) => {
    return filteredLeads.filter(lead => lead.status === status);
  };

  const getStatusColor = (status: LeadStatus) => {
    const column = STATUS_COLUMNS.find(col => col.status === status);
    return column?.color || 'border-gray-300';
  };

  const getStatusBgColor = (status: LeadStatus) => {
    const column = STATUS_COLUMNS.find(col => col.status === status);
    return column?.bgColor || 'bg-gray-50';
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-600 font-bold';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const isStale = (lead: Lead | ReturnType<typeof useRealtimeLeads>['leads'][0]) => {
    return staleLeads.some(s => s.id === lead.id);
  };

  const getDaysSinceUpdate = (lead: Lead | ReturnType<typeof useRealtimeLeads>['leads'][0]) => {
    let updatedAt: Date;
    if (lead.updatedAt instanceof Date) {
      updatedAt = lead.updatedAt;
    } else if (lead.updatedAt && typeof lead.updatedAt === 'object' && 'toDate' in lead.updatedAt) {
      updatedAt = (lead.updatedAt as any).toDate();
    } else {
      updatedAt = new Date(lead.updatedAt as unknown as string | number);
    }
    const diffTime = Math.abs(Date.now() - updatedAt.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros y controles */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Buscar</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Nombre, teléfono..."
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fuente</label>
            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              <option value="web">Web</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="email">Email</option>
              <option value="phone">Teléfono</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prioridad</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showStaleAlerts}
                onChange={(e) => setShowStaleAlerts(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Alertas de leads estancados</span>
            </label>
          </div>
        </div>
      </div>

      {/* Alertas de leads estancados */}
      {showStaleAlerts && staleLeads.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600 font-semibold">⚠️ {staleLeads.length} lead(s) estancado(s)</span>
              <span className="text-sm text-yellow-700">Sin actualización en más de 7 días</span>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {STATUS_COLUMNS.map((column) => {
            const columnLeads = getLeadsByStatus(column.status);
            const isOverLimit = wipLimits[column.status] > 0 && columnLeads.length >= wipLimits[column.status];
            const isDraggingOver = dragOverColumn === column.status;
            
            return (
              <div
                key={column.status}
                className={`flex-shrink-0 w-80 rounded-lg border-2 ${getStatusColor(column.status)} ${getStatusBgColor(column.status)} p-4 transition-all ${
                  isDraggingOver ? 'ring-2 ring-primary-500 ring-offset-2' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, column.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.status)}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800">
                      {column.label}
                    </h3>
                    {isOverLimit && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        Límite
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                      isOverLimit ? 'bg-red-100 text-red-700' : 'bg-white'
                    }`}>
                      {columnLeads.length}
                      {wipLimits[column.status] > 0 && ` / ${wipLimits[column.status]}`}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {columnLeads.map((lead) => {
                    const stale = isStale(lead);
                    const daysStale = stale ? getDaysSinceUpdate(lead) : 0;
                    
                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => handleDragStart(lead)}
                        className={`bg-white rounded-lg shadow-sm p-4 cursor-move hover:shadow-md transition-all ${
                          draggedLead?.id === lead.id ? 'opacity-50' : ''
                        } ${stale ? 'border-2 border-yellow-400' : 'border border-gray-200'}`}
                        onClick={() => onLeadClick?.(lead)}
                      >
                        {stale && (
                          <div className="mb-2 flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                            <span>⚠️</span>
                            <span>{daysStale} días sin actualizar</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-2">
                          <Link 
                            href={`/leads/${lead.id}`}
                            className="font-medium text-gray-900 hover:text-primary-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {lead.contact.name}
                          </Link>
                           {(lead as any).score && (
                             <span className={`text-xs font-semibold ${getScoreColor((lead as any).score.combined)}`}>
                               {(lead as any).score.combined}
                             </span>
                           )}
                        </div>

                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs text-gray-500">{lead.contact.phone}</span>
                          {lead.aiClassification?.priority && (
                            <span className={`text-xs px-2 py-0.5 rounded border ${getPriorityColor(lead.aiClassification.priority)}`}>
                              {lead.aiClassification.priority === 'high' ? 'Alta' : 
                               lead.aiClassification.priority === 'medium' ? 'Media' : 'Baja'}
                            </span>
                          )}
                        </div>

                         {(lead as any).tags && (lead as any).tags.length > 0 && (
                           <div className="flex flex-wrap gap-1 mb-2">
                             {(lead as any).tags.slice(0, 3).map((tag: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                             {(lead as any).tags && (lead as any).tags.length > 3 && (
                              <span className="text-xs text-gray-500">+{(lead as any).tags.length - 3}</span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t">
                          <span className="capitalize">{lead.source}</span>
                          <span>{(() => {
                            let updatedAt: Date;
                            if (lead.updatedAt instanceof Date) {
                              updatedAt = lead.updatedAt;
                            } else if (lead.updatedAt && typeof lead.updatedAt === 'object' && 'toDate' in lead.updatedAt) {
                              updatedAt = (lead.updatedAt as any).toDate();
                            } else {
                              updatedAt = new Date(lead.updatedAt as unknown as string | number);
                            }
                            return updatedAt.toLocaleDateString();
                          })()}</span>
                        </div>
                      </div>
                    );
                  })}

                  {columnLeads.length === 0 && (
                    <div className="text-center text-gray-400 py-8 text-sm border-2 border-dashed border-gray-300 rounded">
                      No hay leads en esta etapa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
