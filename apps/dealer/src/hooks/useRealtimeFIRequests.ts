'use client';

// Solicitudes F&I en tiempo real (Firestore) para el panel dealer / gerencia F&I

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client-base';
import { collection, onSnapshot } from 'firebase/firestore';

export interface FiEmploymentSnapshot {
  monthlyIncome?: number;
  employer?: string;
  timeAtJob?: number;
}

export interface FiCreditSnapshot {
  creditRange?: string;
}

export interface DealerFIRequest {
  id: string;
  clientId: string;
  status: string;
  employment?: FiEmploymentSnapshot;
  creditInfo?: FiCreditSnapshot;
  personalInfo?: Record<string, unknown>;
  sellerNotes?: string;
  fiManagerNotes?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
  createdAt?: Date;
  createdBy: string;
  expeditionStage?: string;
  customerFileId?: string;
}

export function useRealtimeFIRequests(tenantId: string, filterStatus?: string) {
  const [requests, setRequests] = useState<DealerFIRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tenantId || !db) {
      setLoading(false);
      return;
    }

    const col = collection(db, 'tenants', tenantId, 'fi_requests');

    const unsub = onSnapshot(
      col,
      (snapshot) => {
        const rows: DealerFIRequest[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          rows.push({
            id: docSnap.id,
            ...data,
            submittedAt: data.submittedAt?.toDate?.() ?? undefined,
            reviewedAt: data.reviewedAt?.toDate?.() ?? undefined,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
          } as DealerFIRequest);
        });

        const filtered =
          filterStatus && filterStatus !== 'all'
            ? rows.filter((r) => r.status === filterStatus)
            : rows;

        filtered.sort((a, b) => {
          const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return bTime - aTime;
        });

        setRequests(filtered);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [tenantId, filterStatus]);

  return { requests, loading, error };
}
