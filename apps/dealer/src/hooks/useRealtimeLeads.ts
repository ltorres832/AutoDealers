// Hook para obtener leads en tiempo real (Dealer)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client-base';
import { collection, query, onSnapshot, orderBy, limit as firestoreLimit, Timestamp } from 'firebase/firestore';

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
    if (!options.tenantId || !db) {
      setLeads([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Solo orderBy: evita depender de índices compuestos status/assignedTo + createdAt.
      let q = query(
        collection(db, 'tenants', options.tenantId, 'leads'),
        orderBy('createdAt', 'desc')
      );

      if (options.limit) {
        q = query(q, firestoreLimit(Math.min(options.limit * 4, 500)));
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const leadsData: Lead[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            const lead: Lead = {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            } as Lead;

            if (options.status && lead.status !== options.status) return;
            if (options.source && lead.source !== options.source) return;
            if (options.assignedTo && lead.assignedTo !== options.assignedTo) return;

            if (options.search) {
              const searchLower = options.search.toLowerCase();
              const matchesName = lead.contact.name?.toLowerCase().includes(searchLower);
              const matchesPhone = lead.contact.phone?.toLowerCase().includes(searchLower);
              const matchesEmail = lead.contact.email?.toLowerCase().includes(searchLower);
              const ext = lead as Lead & {
                vehicleInterest?: string;
                budget?: string | number;
                tradeIn?: Record<string, unknown>;
                vehicleStockSnapshot?: {
                  make?: string;
                  model?: string;
                  year?: number;
                  stockNumber?: string;
                  vin?: string;
                };
              };
              const interest = ext.vehicleInterest;
              const matchesInterest =
                typeof interest === 'string' && interest.toLowerCase().includes(searchLower);
              const matchesBudget =
                ext.budget != null && String(ext.budget).toLowerCase().includes(searchLower);
              const trade = ext.tradeIn;
              const tradeStr = trade
                ? Object.values(trade)
                    .filter((v) => v != null && v !== '' && typeof v !== 'object')
                    .join(' ')
                    .toLowerCase()
                : '';
              const matchesTrade = tradeStr.includes(searchLower);
              const stock = ext.vehicleStockSnapshot;
              const stockStr = stock
                ? [stock.year, stock.make, stock.model, stock.stockNumber, stock.vin]
                    .filter((x) => x != null && x !== '')
                    .join(' ')
                    .toLowerCase()
                : '';
              const matchesStock = stockStr.includes(searchLower);
              const notesStr = typeof ext.notes === 'string' ? ext.notes.toLowerCase() : '';
              const matchesNotes = notesStr.includes(searchLower);

              if (
                matchesName ||
                matchesPhone ||
                matchesEmail ||
                matchesInterest ||
                matchesBudget ||
                matchesTrade ||
                matchesStock ||
                matchesNotes
              ) {
                leadsData.push(lead);
              }
            } else {
              leadsData.push(lead);
            }
          });

          const capped = options.limit ? leadsData.slice(0, options.limit) : leadsData;
          setLeads(capped);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error en tiempo real leads:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: unknown) {
      console.error('Error configurando listener leads:', err);
      setError(err instanceof Error ? err.message : 'Error de leads');
      setLoading(false);
    }
  }, [
    options.tenantId,
    options.status,
    options.source,
    options.assignedTo,
    options.limit,
    options.search,
  ]);

  return { leads, loading, error };
}
