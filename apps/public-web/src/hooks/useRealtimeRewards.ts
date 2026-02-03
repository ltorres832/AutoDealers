'use client';

import { useState, useEffect } from 'react';
import { getFirebaseClient } from '../lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';

interface Rewards {
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
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const firebaseClient = getFirebaseClient();
    const db = firebaseClient?.db;
    if (!db) {
      // Fallback a fetch si Firebase no está configurado
      fetch('/api/referrals/my-rewards')
        .then((res) => res.json())
        .then((data) => {
          setRewards({
            activeRewards: data.activeRewards,
            stats: data.stats,
          });
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', userId),
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          setRewards({
            activeRewards: userData.activeRewards || {
              nextMonthDiscount: 0,
              freeMonthsRemaining: 0,
              promotionCredits: 0,
              bannerCredits: 0,
            },
            stats: userData.referralStats || {
              totalReferred: 0,
              totalRewarded: 0,
              pendingRewards: 0,
            },
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to rewards:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { rewards, loading };
}

