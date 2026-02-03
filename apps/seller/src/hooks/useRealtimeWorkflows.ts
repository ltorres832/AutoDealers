// Hook para obtener workflows en tiempo real (Dealer)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { Workflow } from '@autodealers/crm';

interface UseRealtimeWorkflowsOptions {
  tenantId?: string;
  enabledOnly?: boolean;
}

export function useRealtimeWorkflows(options: UseRealtimeWorkflowsOptions = {}) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
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
        collection(db, 'tenants', options.tenantId, 'workflows'),
        orderBy('createdAt', 'desc')
      );

      if (options.enabledOnly) {
        q = query(
          collection(db, 'tenants', options.tenantId, 'workflows'),
          where('enabled', '==', true),
          orderBy('createdAt', 'desc')
        );
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot: any) => {
          const workflowsData: Workflow[] = [];
          
          snapshot.forEach((doc: any) => {
            const data = doc.data();
            const workflow: Workflow = {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              lastExecutedAt: data.lastExecutedAt?.toDate(),
            } as Workflow;

            workflowsData.push(workflow);
          });

          setWorkflows(workflowsData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error en tiempo real workflows:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error configurando listener workflows:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [options.tenantId, options.enabledOnly]);

  return { workflows, loading, error };
}

