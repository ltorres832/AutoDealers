'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client-base';
import { collection, onSnapshot } from 'firebase/firestore';
import { filterPublicCatalogMemberships } from '@autodealers/billing/membership-visibility';

interface Membership {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: Record<string, unknown>;
  stripePriceId?: string;
  isActive: boolean;
}

export function useRealtimeMemberships(type: 'dealer' | 'seller' = 'dealer') {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emptyReason, setEmptyReason] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'memberships'),
      (snapshot) => {
        const mapped: Membership[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            name: (d.name as string) || doc.id,
            type: (d.type as 'dealer' | 'seller') || 'dealer',
            price: Number(d.price) || 0,
            currency: (d.currency as string) || 'USD',
            billingCycle: (d.billingCycle as 'monthly' | 'yearly') || 'monthly',
            features: (d.features as Record<string, unknown>) || {},
            stripePriceId: d.stripePriceId as string | undefined,
            isActive: d.isActive !== false,
          };
        });

        let rows = filterPublicCatalogMemberships(mapped.filter((m) => m.type === type));

        rows.sort((a, b) => (a.price || 0) - (b.price || 0));
        setMemberships(rows);
        setEmptyReason(rows.length === 0 ? 'No hay planes activos configurados.' : null);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error en listener memberships:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [type]);

  return { memberships, loading, error, emptyReason };
}
