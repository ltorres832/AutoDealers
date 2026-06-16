'use client';



import { useState, useEffect, useMemo } from 'react';

import { db } from '@/lib/firebase-client';

import { collection, onSnapshot } from 'firebase/firestore';

import { isCatalogMembership } from '@autodealers/billing/membership-visibility';



export interface RealtimeMembership {

  id: string;

  name: string;

  type: 'dealer' | 'seller';

  price: number;

  currency: string;

  billingCycle: 'monthly' | 'yearly';

  isActive: boolean;

  stripePriceId?: string;

  tenantCount?: number;

  features?: Record<string, unknown>;

}



export function useRealtimeMemberships(initialMemberships: RealtimeMembership[] = []) {

  const [memberships, setMemberships] = useState<RealtimeMembership[]>(initialMemberships);

  const [loading, setLoading] = useState(initialMemberships.length === 0);

  const [error, setError] = useState<string | null>(null);



  useEffect(() => {

    if (!db) {

      setLoading(false);

      return;

    }



    const unsubscribe = onSnapshot(

      collection(db, 'memberships'),

      (snapshot) => {

        const rows: RealtimeMembership[] = snapshot.docs

          .map((doc) => {

            const d = doc.data();

            return {

              id: doc.id,

              name: (d.name as string) || doc.id,

              type: (d.type as 'dealer' | 'seller') || 'dealer',

              price: Number(d.price) || 0,

              currency: (d.currency as string) || 'USD',

              billingCycle: (d.billingCycle as 'monthly' | 'yearly') || 'monthly',

              isActive: d.isActive !== false,

              stripePriceId: d.stripePriceId as string | undefined,

              tenantCount: d.tenantCount as number | undefined,

              features: (d.features as Record<string, unknown>) || {},

            };

          })

          .filter((m) =>

            isCatalogMembership({

              id: m.id,

              name: m.name,

              type: m.type,

              billingCycle: m.billingCycle,

            })

          );

        rows.sort((a, b) => {

          if (a.type !== b.type) return a.type === 'dealer' ? -1 : 1;

          return (a.price || 0) - (b.price || 0);

        });

        setMemberships(rows);

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

  }, []);



  const summary = useMemo(

    () => ({

      total: memberships.length,

      dealers: memberships.filter((m) => m.type === 'dealer').length,

      sellers: memberships.filter((m) => m.type === 'seller').length,

      active: memberships.filter((m) => m.isActive).length,

      multiDealer: memberships.filter(

        (m) => m.type === 'dealer' && (m.features as { multiDealerEnabled?: boolean })?.multiDealerEnabled

      ).length,

    }),

    [memberships]

  );



  return { memberships, loading, error, summary, refresh: () => {} };

}


