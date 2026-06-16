'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';

export interface ReferralRewardsView {
  activeRewards: {
    nextMonthDiscount: number;
    freeMonthsRemaining: number;
    promotionCredits: number;
    bannerCredits: number;
  };
  stats: {
    totalReferred: number;
    totalRewarded: number;
    pendingRewards: number;
  };
}

export function useRealtimeRewards(userId: string) {
  const [rewards, setRewards] = useState<ReferralRewardsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    if (!db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', userId),
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          setRewards({
            activeRewards: (userData.activeRewards as ReferralRewardsView['activeRewards']) || {
              nextMonthDiscount: 0,
              freeMonthsRemaining: 0,
              promotionCredits: 0,
              bannerCredits: 0,
            },
            stats: (userData.referralStats as ReferralRewardsView['stats']) || {
              totalReferred: 0,
              totalRewarded: 0,
              pendingRewards: 0,
            },
          });
        } else {
          setRewards(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error en listener rewards:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { rewards, loading, error };
}
