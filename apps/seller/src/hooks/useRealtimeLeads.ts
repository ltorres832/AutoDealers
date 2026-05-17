// Hook para obtener leads en tiempo real (Seller)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, limit as firestoreLimit, Timestamp } from 'firebase/firestore';

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
  assignedTo?: string;
  status?: string;
  limit?: number;
  search?: string;
}

export function useRealtimeLeads(options: UseRealtimeLeadsOptions = {}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!options.tenantId || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let q: any = query(
        collection(db, 'tenants', options.tenantId, 'leads'),
        orderBy('createdAt', 'desc')
      );

      // Sellers solo ven sus leads asignados
      if (options.assignedTo) {
        q = query(
          collection(db, 'tenants', options.tenantId, 'leads'),
          where('assignedTo', '==', options.assignedTo),
          orderBy('createdAt', 'desc')
        );
      }

      if (options.status) {
        q = query(
          collection(db, 'tenants', options.tenantId, 'leads'),
          where('assignedTo', '==', options.assignedTo || ''),
          where('status', '==', options.status),
          orderBy('createdAt', 'desc')
        );
      }

      if (options.limit) {
        q = query(q, firestoreLimit(options.limit));
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot: any) => {
          const leadsData: Lead[] = [];
          
          snapshot.forEach((doc: any) => {
            const data = doc.data();
            let lead: Lead = {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            } as Lead;

            // Filtrar por búsqueda si se proporciona
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

          setLeads(leadsData);
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
    } catch (err: any) {
      console.error('Error configurando listener leads:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [options.tenantId, options.assignedTo, options.status, options.limit, options.search]);

  return { leads, loading, error };
}


