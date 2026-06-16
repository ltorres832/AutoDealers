'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, onSnapshot, type DocumentData } from 'firebase/firestore';
import { toDate } from '@/lib/serialize-firestore';

export interface RealtimeSubscription {
  id: string;
  tenantId: string;
  userId: string;
  membershipId: string;
  status: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  lastPaymentDate?: string;
  nextPaymentDate?: string;
  daysPastDue?: number;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  tenantName?: string;
  userName?: string;
  membershipName?: string;
  amount?: number;
}

type RawSub = { id: string; data: DocumentData };

function buildSubscription(
  raw: RawSub,
  tenantNames: Map<string, string>,
  userNames: Map<string, string>,
  membershipMeta: Map<string, { name: string; price?: number }>
): RealtimeSubscription {
  const data = raw.data;
  const periodStart = toDate(data.currentPeriodStart);
  const periodEnd = toDate(data.currentPeriodEnd);
  const lastPayment = toDate(data.lastPaymentDate) ?? periodStart;
  const nextPayment = toDate(data.nextPaymentDate) ?? periodEnd;
  const membership = membershipMeta.get(data.membershipId);

  return {
    id: raw.id,
    tenantId: data.tenantId,
    userId: data.userId,
    membershipId: data.membershipId,
    status: data.status,
    currentPeriodStart: periodStart?.toISOString(),
    currentPeriodEnd: periodEnd?.toISOString(),
    lastPaymentDate: lastPayment?.toISOString(),
    nextPaymentDate: nextPayment?.toISOString(),
    daysPastDue: data.daysPastDue,
    stripeSubscriptionId: data.stripeSubscriptionId,
    stripeCustomerId: data.stripeCustomerId,
    tenantName: tenantNames.get(data.tenantId),
    userName: userNames.get(data.userId),
    membershipName: membership?.name,
    amount: membership?.price,
  };
}

export function useRealtimeSubscriptions(filter?: { status?: string }) {
  const [rawSubs, setRawSubs] = useState<RawSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantNames, setTenantNames] = useState<Map<string, string>>(new Map());
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
  const [membershipMeta, setMembershipMeta] = useState<
    Map<string, { name: string; price?: number }>
  >(new Map());

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const tenantsUnsub = onSnapshot(collection(db, 'tenants'), (snap) => {
      const map = new Map<string, string>();
      snap.docs.forEach((d) => {
        const name = d.data().name;
        if (name) map.set(d.id, name);
      });
      setTenantNames(map);
    });

    const usersUnsub = onSnapshot(collection(db, 'users'), (snap) => {
      const map = new Map<string, string>();
      snap.docs.forEach((d) => {
        const name = d.data().name;
        if (name) map.set(d.id, name);
      });
      setUserNames(map);
    });

    const membershipsUnsub = onSnapshot(collection(db, 'memberships'), (snap) => {
      const map = new Map<string, { name: string; price?: number }>();
      snap.docs.forEach((d) => {
        const data = d.data();
        map.set(d.id, { name: data.name, price: data.price });
      });
      setMembershipMeta(map);
    });

    const subsUnsub = onSnapshot(collection(db, 'subscriptions'), (snapshot) => {
        const rows = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
        rows.sort((a, b) => {
          const ta = toDate(a.data.updatedAt)?.getTime() ?? 0;
          const tb = toDate(b.data.updatedAt)?.getTime() ?? 0;
          return tb - ta;
        });
        setRawSubs(rows);
        setLoading(false);
      },
      (err) => {
        console.error('subscriptions onSnapshot error:', err);
        setLoading(false);
      }
    );

    return () => {
      tenantsUnsub();
      usersUnsub();
      membershipsUnsub();
      subsUnsub();
    };
  }, []);

  const subscriptions = useMemo(
    () => rawSubs.map((raw) => buildSubscription(raw, tenantNames, userNames, membershipMeta)),
    [rawSubs, tenantNames, userNames, membershipMeta]
  );

  const filtered = useMemo(() => {
    if (!filter?.status || filter.status === 'all') return subscriptions;
    return subscriptions.filter((s) => s.status === filter.status);
  }, [subscriptions, filter?.status]);

  const stats = useMemo(
    () => ({
      total: subscriptions.length,
      active: subscriptions.filter((s) => s.status === 'active').length,
      pastDue: subscriptions.filter((s) => s.status === 'past_due').length,
      suspended: subscriptions.filter((s) => s.status === 'suspended').length,
      cancelled: subscriptions.filter((s) => s.status === 'cancelled').length,
    }),
    [subscriptions]
  );

  return { subscriptions: filtered, stats, loading };
}
