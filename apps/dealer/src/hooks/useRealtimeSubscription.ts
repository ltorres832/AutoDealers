'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client-base';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';

interface Subscription {
  id: string;
  tenantId: string;
  userId: string;
  membershipId: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  status: 'active' | 'past_due' | 'cancelled' | 'suspended' | 'trialing' | 'unpaid' | 'incomplete' | 'incomplete_expired';
  currentPeriodStart: Date | Timestamp;
  currentPeriodEnd: Date | Timestamp;
  cancelAtPeriodEnd: boolean;
  daysPastDue?: number;
  statusReason?: string;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
  customMembershipAssignmentId?: string;
  billingSource?: string;
}

function timestampMillis(value: any): number {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.getTime() : 0;
}

function subscriptionPriority(data: any): number {
  if (data.status === 'active' || data.status === 'trialing') return 400;
  if (data.status === 'past_due') return 300;
  if (data.customMembershipAssignmentId || data.billingSource === 'admin_grant') return 200;
  if (data.status === 'incomplete') return 100;
  return 0;
}

function mapApiSubscription(raw: any): Subscription {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    userId: raw.userId,
    membershipId: raw.membershipId,
    status: raw.status,
    currentPeriodStart: raw.currentPeriodStart,
    currentPeriodEnd: raw.currentPeriodEnd,
    cancelAtPeriodEnd: Boolean(raw.cancelAtPeriodEnd),
    daysPastDue: raw.daysPastDue,
    statusReason: raw.statusReason,
    billingSource: raw.billingSource,
    customMembershipAssignmentId: raw.customMembershipAssignmentId,
  } as Subscription;
}

async function fetchSubscriptionFromApi(): Promise<Subscription | null> {
  const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
  const res = await fetchWithAuth('/api/settings/membership/subscription', {});
  if (!res.ok) return null;
  const data = await res.json();
  return data.subscription ? mapApiSubscription(data.subscription) : null;
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
    let cancelled = false;

    const applyApiFallback = async () => {
      try {
        const fromApi = await fetchSubscriptionFromApi();
        if (cancelled) return;
        if (fromApi) {
          setSubscription(fromApi);
        }
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    void applyApiFallback();

    try {
      const q = query(
        collection(db, 'subscriptions'),
        where('tenantId', '==', tenantId)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (cancelled) return;
          if (snapshot.empty) {
            void applyApiFallback();
            return;
          }

          const doc = [...snapshot.docs].sort((a: any, b: any) => {
            const pa = subscriptionPriority(a.data());
            const pb = subscriptionPriority(b.data());
            if (pa !== pb) return pb - pa;
            return timestampMillis(b.data().updatedAt || b.data().createdAt) - timestampMillis(a.data().updatedAt || a.data().createdAt);
          })[0];
          const data = doc.data();

          setSubscription({
            id: doc.id,
            ...data,
            currentPeriodStart: data.currentPeriodStart?.toDate ? data.currentPeriodStart.toDate() : new Date(data.currentPeriodStart),
            currentPeriodEnd: data.currentPeriodEnd?.toDate ? data.currentPeriodEnd.toDate() : new Date(data.currentPeriodEnd),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
          } as Subscription);
          setLoading(false);
        },
        (err) => {
          console.error('Error en listener de suscripción:', err);
          if (cancelled) return;
          setError(err.message);
          void applyApiFallback();
        }
      );

      return () => {
        cancelled = true;
        unsubscribe();
      };
    } catch (err: any) {
      console.error('Error setting up subscription listener:', err);
      setError(err.message);
      void applyApiFallback();
      return () => {
        cancelled = true;
      };
    }
  }, [tenantId]);

  return { subscription, loading, error };
}
