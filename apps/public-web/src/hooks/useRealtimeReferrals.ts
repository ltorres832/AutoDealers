'use client';

import { useState, useEffect } from 'react';
import { getFirebaseClient } from '../lib/firebase-client';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

interface Referral {
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
  createdAt: any;
  confirmedAt?: any;
  rewardsGrantedAt?: any;
}

export function useRealtimeReferrals(userId: string) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
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
      fetch('/api/referrals/my-referrals')
        .then((res) => res.json())
        .then((data) => {
          setReferrals(data.referrals || []);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
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
        const referralsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          confirmedAt: doc.data().confirmedAt?.toDate?.() || undefined,
          rewardsGrantedAt: doc.data().rewardsGrantedAt?.toDate?.() || undefined,
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
  }, [userId]);

  return { referrals, loading };
}

