'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, onSnapshot } from 'firebase/firestore';
import { isCatalogMembership } from '@autodealers/billing/membership-visibility';
import { serializeMembershipPromoForApi } from '@autodealers/billing/membership-promo-pricing';
import {
  ensureFirebaseClientAuth,
  isFirebaseClientReady,
} from '@/lib/ensure-firebase-client-auth';



export interface RealtimeMembership {

  id: string;

  name: string;

  type: 'dealer' | 'seller' | 'business';

  price: number;

  currency: string;

  billingCycle: 'monthly' | 'yearly';

  isActive: boolean;

  stripePriceId?: string;

  tenantCount?: number;

  features?: Record<string, unknown>;

  displayPrice?: number;
  regularPrice?: number;
  launchActive?: boolean;
  introConfigured?: boolean;
  pricingBadge?: string | null;
  launchPrice?: number | null;
  introPrice?: number | null;
  introMonths?: number | null;
}



export function useRealtimeMemberships(initialMemberships: RealtimeMembership[] = []) {

  const [memberships, setMemberships] = useState<RealtimeMembership[]>(initialMemberships);

  const [loading, setLoading] = useState(initialMemberships.length === 0);

  const [error, setError] = useState<string | null>(null);



  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    async function startListener() {
      if (!isFirebaseClientReady()) {
        setLoading(false);
        return;
      }

      const authed = await ensureFirebaseClientAuth();
      if (cancelled || !authed) {
        setLoading(false);
        return;
      }

      unsubscribe = onSnapshot(
        collection(db, 'memberships'),
        (snapshot) => {
          const rows: RealtimeMembership[] = snapshot.docs
            .map((doc) => {
              const d = doc.data();
              const promo = serializeMembershipPromoForApi(d as Record<string, unknown>);
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
                ...promo,
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
            const pa = Number(a.displayPrice ?? a.price) || 0;
            const pb = Number(b.displayPrice ?? b.price) || 0;
            return pa - pb;
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
    }

    void startListener();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
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


