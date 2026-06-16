'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, onSnapshot } from 'firebase/firestore';

interface Tenant {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  status: string;
  createdAt: string | Date;
  userCount?: number;
  vehicleCount?: number;
  leadCount?: number;
  companyName?: string;
  subdomain?: string;
  avgDealerRating?: number;
  dealerRatingCount?: number;
  avgSellerRating?: number;
  sellerRatingCount?: number;
}

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  return new Date();
}

export function useRealtimeTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'tenants'),
      (snapshot) => {
        const rows: Tenant[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            name: (d.name as string) || (d.companyName as string) || doc.id,
            type: (d.type as 'dealer' | 'seller') || 'dealer',
            status: (d.status as string) || 'active',
            createdAt: toDate(d.createdAt),
            companyName: d.companyName as string | undefined,
            subdomain: d.subdomain as string | undefined,
            avgDealerRating: d.avgDealerRating as number | undefined,
            dealerRatingCount: d.dealerRatingCount as number | undefined,
            avgSellerRating: d.avgSellerRating as number | undefined,
            sellerRatingCount: d.sellerRatingCount as number | undefined,
          };
        });
        rows.sort((a, b) => {
          const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
          const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
          return tb - ta;
        });
        setTenants(rows);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error en listener tenants:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { tenants, loading, error };
}
