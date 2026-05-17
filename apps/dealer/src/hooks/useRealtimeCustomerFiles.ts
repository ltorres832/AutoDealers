'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client-base';
import { collection, onSnapshot } from 'firebase/firestore';

export type CustomerFileStatusFilter = 'all' | 'active' | 'completed' | 'archived';

function toIso(v: unknown): string {
  if (v == null) return new Date().toISOString();
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function mapCustomerFileDoc(id: string, data: Record<string, unknown>) {
  const documents = Array.isArray(data.documents) ? data.documents : [];
  const requestedDocuments = Array.isArray(data.requestedDocuments) ? data.requestedDocuments : [];

  return {
    id,
    saleId: String(data.saleId ?? ''),
    customerId: typeof data.customerId === 'string' ? data.customerId : undefined,
    customerInfo: {
      fullName: (data.customerInfo as any)?.fullName ?? '',
      phone: (data.customerInfo as any)?.phone ?? '',
      email: (data.customerInfo as any)?.email ?? '',
    },
    vehicleId: String(data.vehicleId ?? ''),
    sellerInfo: data.sellerInfo as
      | { id: string; name: string; email: string }
      | undefined,
    documents: documents.map((d: any) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      url: d.url,
      uploadedBy: d.uploadedBy,
      uploadedAt: toIso(d.uploadedAt),
    })),
    requestedDocuments: requestedDocuments.map((d: any) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      required: !!d.required,
      status: d.status || 'pending',
    })),
    uploadToken: String(data.uploadToken ?? ''),
    status: (data.status as 'active' | 'completed' | 'archived' | 'deleted') || 'active',
    notes: String(data.notes ?? ''),
    expeditionStage: typeof data.expeditionStage === 'string' ? data.expeditionStage : undefined,
    linkedFiRequestId: typeof data.linkedFiRequestId === 'string' ? data.linkedFiRequestId : undefined,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export type RealtimeCustomerFile = ReturnType<typeof mapCustomerFileDoc>;

export function useRealtimeCustomerFiles(
  tenantId: string | undefined,
  statusFilter: CustomerFileStatusFilter
) {
  const [files, setFiles] = useState<RealtimeCustomerFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tenantId || !db) {
      setLoading(false);
      return;
    }

    const col = collection(db, 'tenants', tenantId, 'customer_files');

    const applySnapshot = (snapshot: { docs: { id: string; data: () => Record<string, unknown> }[] }) => {
      let rows = snapshot.docs.map((docSnap) => mapCustomerFileDoc(docSnap.id, docSnap.data()));
      if (statusFilter !== 'all') {
        rows = rows.filter((f) => f.status === statusFilter);
      }
      rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setFiles(rows);
      setLoading(false);
      setError(null);
    };

    const unsub = onSnapshot(
      col,
      (snapshot) => applySnapshot(snapshot),
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [tenantId, statusFilter]);

  return { files, loading, error };
}
