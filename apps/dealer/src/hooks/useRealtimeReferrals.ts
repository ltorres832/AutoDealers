'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase-client-base';

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

export function useRealtimeReferrals(referrerId: string) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!referrerId || !db) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', referrerId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const referralsData = snapshot.docs.map((doc) => ({
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
  }, [referrerId]);

  return { referrals, loading };
}

