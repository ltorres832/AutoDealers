'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client-base';
import { collection, onSnapshot } from 'firebase/firestore';

export interface CorporateEmailRow {
  id: string;
  tenantId: string;
  userId: string;
  emailAddress: string;
  username?: string;
  status: 'active' | 'suspended' | 'pending' | 'deleted';
  isAlias?: boolean;
  parentEmailId?: string;
  signature?: string;
  createdAt: Date;
  updatedAt: Date;
}

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && 'toDate' in v) {
    return (v as { toDate: () => Date }).toDate();
  }
  return new Date();
}

export function useRealtimeCorporateEmails(tenantId?: string) {
  const [emails, setEmails] = useState<CorporateEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !db) {
      setEmails([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'tenants', tenantId, 'corporate_emails'),
      (snapshot) => {
        const rows: CorporateEmailRow[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            tenantId,
            userId: (d.userId as string) || '',
            emailAddress: (d.emailAddress as string) || '',
            username: d.username as string | undefined,
            status: (d.status as CorporateEmailRow['status']) || 'pending',
            isAlias: d.isAlias === true,
            parentEmailId: d.parentEmailId as string | undefined,
            signature: d.signature as string | undefined,
            createdAt: toDate(d.createdAt),
            updatedAt: toDate(d.updatedAt),
          };
        });
        rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        setEmails(rows);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error corporate_emails listener:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId]);

  return { emails, loading, error };
}
