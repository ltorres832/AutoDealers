'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
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

export function useRealtimeMemberships(type: 'dealer' | 'seller' = 'seller') {
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
        (snapshot: any) => {
          const membershipsData: Membership[] = [];
          
          snapshot.forEach((doc: any) => {
            const data = doc.data();
            membershipsData.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            } as Membership);
          });

          // Ordenar por precio
          membershipsData.sort((a, b) => a.price - b.price);

          setMemberships(membershipsData);
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
  }, [type]);

  return { memberships, loading, error };
}

