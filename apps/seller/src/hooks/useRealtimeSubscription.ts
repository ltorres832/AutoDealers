'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';

interface Subscription {
  id: string;
  tenantId: string;
  userId: string;
  membershipId: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  status: 'active' | 'past_due' | 'cancelled' | 'suspended' | 'trialing' | 'unpaid';
  currentPeriodStart: Date | Timestamp;
  currentPeriodEnd: Date | Timestamp;
  cancelAtPeriodEnd: boolean;
  daysPastDue?: number;
  statusReason?: string;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export function useRealtimeSubscription(tenantId?: string) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'subscriptions'),
        where('tenantId', '==', tenantId)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot: any) => {
          if (snapshot.empty) {
            setSubscription(null);
            setLoading(false);
            return;
          }

          // Tomar la primera suscripción (debería haber solo una activa)
          const doc = snapshot.docs[0];
          const data = doc.data();
          
          const subscriptionData: Subscription = {
            id: doc.id,
            ...data,
            currentPeriodStart: data.currentPeriodStart?.toDate ? data.currentPeriodStart.toDate() : new Date(data.currentPeriodStart),
            currentPeriodEnd: data.currentPeriodEnd?.toDate ? data.currentPeriodEnd.toDate() : new Date(data.currentPeriodEnd),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
          } as Subscription;

          setSubscription(subscriptionData);
          setLoading(false);
        },
        (err) => {
          console.error('Error en listener de suscripción:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error setting up subscription listener:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [tenantId]);

  return { subscription, loading, error };
}

