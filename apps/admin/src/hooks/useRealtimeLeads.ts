'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, limit as firestoreLimit, Timestamp, QuerySnapshot } from 'firebase/firestore';

interface Lead {
  id: string;
  tenantId: string;
  contact: {
    name: string;
    phone: string;
    email?: string;
    preferredChannel?: string;
  };
  source: string;
  status: string;
  assignedTo?: string;
  notes?: string;
  interactions?: any[];
  aiClassification?: {
    priority: string;
    sentiment: string;
    tags?: string[];
  };
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

interface UseRealtimeLeadsOptions {
  tenantId?: string;
  status?: string;
  source?: string;
  assignedTo?: string;
  limit?: number;
  search?: string;
}

export function useRealtimeLeads(options: UseRealtimeLeadsOptions = {}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!options.tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Construir query base
      let q = query(
        collection(db, 'tenants', options.tenantId, 'leads'),
        orderBy('createdAt', 'desc')
      );

      // Aplicar filtros
      if (options.status) {
        q = query(q, where('status', '==', options.status));
      }

      if (options.source) {
        q = query(q, where('source', '==', options.source));
      }

      if (options.assignedTo) {
        q = query(q, where('assignedTo', '==', options.assignedTo));
      }

      if (options.limit) {
        q = query(q, firestoreLimit(options.limit));
      }

      // Listener en tiempo real
      const unsubscribe = onSnapshot(
        q,
        (snapshot: any) => {
          const leadsData: Lead[] = [];
          
          snapshot.forEach((doc: any) => {
            const data = doc.data();
            leadsData.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
            } as Lead);
          });

          // Aplicar búsqueda en memoria si existe
          let filteredLeads = leadsData;
          if (options.search) {
            const searchLower = options.search.toLowerCase();
            filteredLeads = leadsData.filter(lead => 
              lead.contact.name.toLowerCase().includes(searchLower) ||
              lead.contact.phone.includes(searchLower) ||
              lead.contact.email?.toLowerCase().includes(searchLower) ||
              lead.notes?.toLowerCase().includes(searchLower)
            );
          }

          setLeads(filteredLeads);
          setLoading(false);
        },
        (err) => {
          console.error('Error en listener de leads:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error setting up leads listener:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [options.tenantId, options.status, options.source, options.assignedTo, options.limit, options.search]);

  return { leads, loading, error };
}

