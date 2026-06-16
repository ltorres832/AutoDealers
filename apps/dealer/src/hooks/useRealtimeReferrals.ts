'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client-base';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export interface ReferralRow {
  id: string;
  referredEmail: string;
  membershipType: string;
  userType: string;
  status: string;
  rewardStatus: {
    discountApplied: boolean;
    freeMonthApplied: boolean;
    promotionsAvailable: number;
    bannersAvailable: number;
    promotionsUsed: number;
    bannersUsed: number;
  };
  createdAt: string;
  confirmedAt?: string;
  rewardsGrantedAt?: string;
}

function toIso(v: unknown): string | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'toDate' in v) {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

export function useRealtimeReferrals(userId: string) {
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !db) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows: ReferralRow[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            referredEmail: (d.referredEmail as string) || '',
            membershipType: (d.membershipType as string) || '',
            userType: (d.userType as string) || '',
            status: (d.status as string) || '',
            rewardStatus: (d.rewardStatus as ReferralRow['rewardStatus']) || {
              discountApplied: false,
              freeMonthApplied: false,
              promotionsAvailable: 0,
              bannersAvailable: 0,
              promotionsUsed: 0,
              bannersUsed: 0,
            },
            createdAt: toIso(d.createdAt) || new Date().toISOString(),
            confirmedAt: toIso(d.confirmedAt),
            rewardsGrantedAt: toIso(d.rewardsGrantedAt),
          };
        });
        setReferrals(rows);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error en listener referrals:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { referrals, loading, error };
}
