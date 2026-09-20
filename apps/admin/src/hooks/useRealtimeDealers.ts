// Hook para obtener dealers en tiempo real (Admin)
//
// Los dealers viven en la colección `tenants` con `type === 'dealer'` (ahí es
// donde el registro público y la creación de tenants escriben). La antigua
// colección `dealers` quedó huérfana y vacía, por lo que este hook lee de
// `tenants` para reflejar los dealers reales de la plataforma.

'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, onSnapshot } from 'firebase/firestore';

export type DealerStatus = 'active' | 'suspended' | 'cancelled' | 'pending';

export interface DealerTenant {
  dealerId: string;
  ownerUid?: string;
  name: string;
  companyName?: string;
  subdomain?: string;
  status: DealerStatus;
  membershipId?: string;
  createdAt: Date;
}

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (
    v &&
    typeof v === 'object' &&
    'toDate' in v &&
    typeof (v as { toDate: () => Date }).toDate === 'function'
  ) {
    return (v as { toDate: () => Date }).toDate();
  }
  return new Date();
}

export function useRealtimeDealers() {
  const [dealers, setDealers] = useState<DealerTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      collection(db, 'tenants'),
      (snapshot) => {
        try {
          const rows: DealerTenant[] = snapshot.docs
            .map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
            .filter(({ data }) => (data.type as string) === 'dealer')
            .map(({ id, data }) => ({
              dealerId: id,
              ownerUid: (data.ownerId as string) || undefined,
              name: (data.name as string) || (data.companyName as string) || id,
              companyName: (data.companyName as string) || undefined,
              subdomain: (data.subdomain as string) || undefined,
              status: ((data.status as string) || 'active') as DealerStatus,
              membershipId: (data.membershipId as string) || undefined,
              createdAt: toDate(data.createdAt),
            }));

          rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          setDealers(rows);
          setLoading(false);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Error processing dealers'));
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to dealers (tenants):', err);
        setError(err instanceof Error ? err : new Error('Error listening to dealers'));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { dealers, loading, error };
}
