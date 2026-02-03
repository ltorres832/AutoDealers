'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client-base';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';

interface Membership {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: any;
  stripePriceId: string;
  isActive: boolean;
  createdAt?: Date | Timestamp;
}

export function useRealtimeMemberships(type: 'dealer' | 'seller' = 'dealer', filterMultiDealer?: boolean | null) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'memberships'),
        where('type', '==', type),
        where('isActive', '==', true)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const membershipsData: Membership[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            membershipsData.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            } as Membership);
          });

          // Filtrar según el tipo de cuenta si se especifica
          let filteredMemberships = membershipsData;
          if (filterMultiDealer !== undefined && filterMultiDealer !== null) {
            if (filterMultiDealer) {
              // Solo multi-dealer
              filteredMemberships = membershipsData.filter(m => m.features?.multiDealerEnabled === true);
            } else {
              // Solo dealer regular (NO multi-dealer)
              filteredMemberships = membershipsData.filter(m => !m.features?.multiDealerEnabled);
            }
          }

          // Ordenar por precio
          filteredMemberships.sort((a, b) => a.price - b.price);

          setMemberships(filteredMemberships);
          setLoading(false);
        },
        (err) => {
          console.error('Error en listener de membresías:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error setting up memberships listener:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [type, filterMultiDealer]);

  return { memberships, loading, error };
}

