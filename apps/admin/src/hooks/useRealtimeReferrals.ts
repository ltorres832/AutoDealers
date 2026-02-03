'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, QuerySnapshot } from 'firebase/firestore';

interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  referredEmail: string;
  referralCode: string;
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
  createdAt: any;
  confirmedAt?: any;
  rewardsGrantedAt?: any;
}

export function useRealtimeReferrals(filter?: { status?: string; referrerId?: string }) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    let q = query(collection(db, 'referrals'), orderBy('createdAt', 'desc'));

    // Aplicar filtros si existen
    if (filter?.status && filter.status !== 'all') {
      q = query(q, where('status', '==', filter.status));
    }
    if (filter?.referrerId) {
      q = query(q, where('referrerId', '==', filter.referrerId));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot: any) => {
        const referralsData = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          confirmedAt: doc.data().confirmedAt?.toDate()?.toISOString(),
          rewardsGrantedAt: doc.data().rewardsGrantedAt?.toDate()?.toISOString(),
        })) as Referral[];
        setReferrals(referralsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to referrals:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filter?.status, filter?.referrerId]);

  return { referrals, loading };
}

