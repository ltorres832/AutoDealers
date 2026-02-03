'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRealtimeLeads } from '@/hooks/useRealtimeLeads';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeIndicator } from './RealtimeIndicator';
import { NewItemBadge } from './NewItemBadge';

interface Lead {
  id: string;
  contact: {
    name: string;
    phone: string;
    email?: string;
  };
  source: string;
  status: string;
  assignedTo?: string;
  aiClassification?: {
    priority: string;
    sentiment: string;
  };
  createdAt: Date | string;
}

export default function LeadsList() {
  const { auth } = useAuth();
  const [filters, setFilters] = useState({
    status: '',
    source: '',
    search: '',
  });

  const previousLeadsCount = useRef(0);
  const [newLeads, setNewLeads] = useState<Set<string>>(new Set());

  // Usar hook de tiempo real
  const { leads, loading } = useRealtimeLeads({
    tenantId: auth?.tenantId,
    status: filters.status || undefined,
    source: filters.source || undefined,
    search: filters.search || undefined,
  });

  // Detectar nuevos leads
  useEffect(() => {
    if (leads.length > previousLeadsCount.current) {
      const newLeadIds = new Set<string>();
      leads.slice(0, leads.length - previousLeadsCount.current).forEach(lead => {
        newLeadIds.add(lead.id);
      });
      setNewLeads(newLeadIds);
      
      // Remover el badge después de 5 segundos
      setTimeout(() => {
        setNewLeads(new Set());
      }, 5000);
    }
    previousLeadsCount.current = leads.length;
  }, [leads.length]);

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

  function getPriorityColor(priority: string) {
    const colors: Record<string, string> = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500',
    };
    return colors[priority] || 'bg-gray-500';
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
      {/* Filtros */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <RealtimeIndicator isActive={!loading && auth?.tenantId !== undefined} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Todos los estados</option>
              <option value="new">Nuevo</option>
              <option value="contacted">Contactado</option>
              <option value="qualified">Calificado</option>
              <option value="appointment">Cita</option>
              <option value="closed">Cerrado</option>
              <option value="lost">Perdido</option>
            </select>
          </div>
          <div>
            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Todas las fuentes</option>
              <option value="web">Web</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="email">Email</option>
              <option value="phone">Teléfono</option>
            </select>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-600">
              {leads.length} lead{leads.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Leads */}
      <div className="divide-y">
        {leads.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No hay leads que mostrar
          </div>
        ) : (
          leads.map((lead) => (
            <NewItemBadge key={lead.id} isNew={newLeads.has(lead.id)}>
              <Link
                href={`/leads/${lead.id}`}
                className="block p-4 hover:bg-gray-50 transition-all duration-300 border-l-4 border-transparent hover:border-blue-500"
              >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* Prioridad IA */}
                  {lead.aiClassification && (
                    <div
                      className={`w-3 h-3 rounded-full ${getPriorityColor(
                        lead.aiClassification.priority
                      )}`}
                      title={`Prioridad: ${lead.aiClassification.priority}`}
                    />
                  )}

                  {/* Avatar */}
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-bold text-lg">
                      {lead.contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Información */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{lead.contact.name}</h3>
                      {lead.aiClassification && (
                        <span
                          className={`px-2 py-1 rounded text-xs ${getStatusColor(
                            lead.aiClassification.sentiment
                          )}`}
                        >
                          {lead.aiClassification.sentiment}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>{lead.contact.phone}</span>
                      {lead.contact.email && <span>{lead.contact.email}</span>}
                      <span className="capitalize">{lead.source}</span>
                    </div>
                  </div>

                  {/* Estado y Fecha */}
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
                      {lead.createdAt instanceof Date 
                        ? lead.createdAt.toLocaleDateString() 
                        : lead.createdAt instanceof Date 
  ? lead.createdAt 
  : (lead.createdAt as any)?.toDate?.() 
    ? (lead.createdAt as any).toDate() 
    : new Date(lead.createdAt as unknown as string | number).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              </Link>
            </NewItemBadge>
          ))
        )}
      </div>
    </div>
  );
}
