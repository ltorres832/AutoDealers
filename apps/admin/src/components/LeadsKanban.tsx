'use client';

import { useState, useEffect } from 'react';
import { Lead, LeadStatus } from '@autodealers/crm';

interface LeadsKanbanProps {
  tenantId?: string; // Opcional para admin que puede ver todos
}

const STATUS_COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
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

export default function LeadsKanban({ tenantId }: LeadsKanbanProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  useEffect(() => {
    loadLeads();
  }, [tenantId]);

  async function loadLeads() {
    try {
      setLoading(true);
      const params = tenantId ? `?tenantId=${tenantId}` : '';
      const response = await fetch(`/api/admin/all-leads${params}`, {
        credentials: 'include',
      });
      const data = await response.json();
      setLeads(data.leads || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  }

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
      await fetch(`/api/leads/${draggedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      setDraggedLead(null);
    } catch (error) {
      console.error('Error updating lead status:', error);
      loadLeads(); // Revertir
      alert('Error al actualizar el estado del lead');
    }
  };

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter(lead => lead.status === status);
  };

  const getStatusColor = (status: LeadStatus) => {
    const column = STATUS_COLUMNS.find(col => col.status === status);
    return column?.color || 'bg-gray-50 border-gray-200';
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

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {STATUS_COLUMNS.map((column) => {
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
                    className="bg-white rounded-lg shadow-sm p-4 cursor-move hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{lead.contact.name}</h4>
                      {lead.score && (
                        <span className={`text-xs font-semibold ${getScoreColor(lead.score.combined)}`}>
                          {lead.score.combined}
                        </span>
                      )}
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
    </div>
  );
}


