'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
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
    if (!userId || !db) {
      setLoading(false);
      return;
    }

    // Listener en tiempo real para el documento del usuario
    const unsubscribe = onSnapshot(
      doc(db, 'users', userId),
      async (snapshot: any) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          const activeRewards = userData.activeRewards || {
            nextMonthDiscount: 0,
            freeMonthsRemaining: 0,
            promotionCredits: 0,
            bannerCredits: 0,
          };

          // Obtener créditos disponibles (esto requiere llamada a API ya que getAvailableCredits es server-side)
          try {
            const creditsResponse = await fetch('/api/referrals/my-rewards', { credentials: 'include' });
            if (creditsResponse.ok) {
              const creditsData = await creditsResponse.json();
              setRewards({
                activeRewards: {
                  ...activeRewards,
                  promotionCredits: creditsData.activeRewards?.promotionCredits || 0,
                  bannerCredits: creditsData.activeRewards?.bannerCredits || 0,
                },
                stats: creditsData.stats || {
                  totalReferred: 0,
                  totalRewarded: 0,
                  pendingRewards: 0,
                },
              });
            } else {
              // Fallback si falla la API
              setRewards({
                activeRewards,
                stats: userData.referralStats || {
                  totalReferred: 0,
                  totalRewarded: 0,
                  pendingRewards: 0,
                },
              });
            }
          } catch (error) {
            console.error('Error fetching credits:', error);
            setRewards({
              activeRewards,
              stats: userData.referralStats || {
                totalReferred: 0,
                totalRewarded: 0,
                pendingRewards: 0,
              },
            });
          }
        } else {
          setRewards(null);
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

