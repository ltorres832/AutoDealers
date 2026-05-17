'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';

export interface RealtimeFIRequest {
  id: string;
  clientId: string;
  status: string;
  customerFileId?: string;
  expeditionStage?: string;
  linkedFiRequestId?: string;
  employment?: any;
  creditInfo?: any;
  personalInfo?: any;
  sellerNotes?: string;
  fiManagerNotes?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
  createdBy: string;
  history?: any[];
  financingCalculation?: any;
  approvalScore?: any;
  cosigner?: any;
  financingOptions?: any[];
  createdAt?: Date;
  updatedAt?: Date;
}

export function useRealtimeFIRequest(tenantId: string | undefined, requestId: string | undefined) {
  const [request, setRequest] = useState<RealtimeFIRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tenantId || !requestId || !db) {
      setLoading(false);
      return;
    }

    const ref = doc(db, 'tenants', tenantId, 'fi_requests', requestId);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setRequest(null);
          setLoading(false);
          setError(null);
          return;
        }
        const data = snap.data();
        setRequest({
          id: snap.id,
          ...data,
          submittedAt: data.submittedAt?.toDate?.() ?? data.submittedAt,
          reviewedAt: data.reviewedAt?.toDate?.() ?? data.reviewedAt,
          createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt,
        } as RealtimeFIRequest);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('useRealtimeFIRequest:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [tenantId, requestId]);

  return { request, loading, error };
}
