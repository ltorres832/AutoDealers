'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, collectionGroup, query, where, onSnapshot } from 'firebase/firestore';

interface AdminStats {
  totalUsers: number;
  totalTenants: number;
  totalVehicles: number;
  totalLeads: number;
  totalSales: number;
  totalRevenue: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  pastDueSubscriptions: number;
  suspendedSubscriptions: number;
}

const emptyStats: AdminStats = {
  totalUsers: 0,
  totalTenants: 0,
  totalVehicles: 0,
  totalLeads: 0,
  totalSales: 0,
  totalRevenue: 0,
  activeSubscriptions: 0,
  monthlyRevenue: 0,
  pastDueSubscriptions: 0,
  suspendedSubscriptions: 0,
};

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  return new Date(0);
}

export function useRealtimeAdminStats() {
  const [stats, setStats] = useState<AdminStats>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalUsers = 0;
    let totalTenants = 0;
    let totalVehicles = 0;
    let totalLeads = 0;
    let totalSales = 0;
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let activeSubscriptions = 0;
    let pastDueSubscriptions = 0;
    let suspendedSubscriptions = 0;

    function recompute() {
      setStats({
        totalUsers,
        totalTenants,
        totalVehicles,
        totalLeads,
        totalSales,
        totalRevenue,
        activeSubscriptions,
        monthlyRevenue,
        pastDueSubscriptions,
        suspendedSubscriptions,
      });
      setLoading(false);
    }

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      totalUsers = snap.size;
      recompute();
    });

    const unsubTenants = onSnapshot(collection(db, 'tenants'), (snap) => {
      totalTenants = snap.size;
      recompute();
    });

    const unsubVehicles = onSnapshot(collectionGroup(db, 'vehicles'), (snap) => {
      totalVehicles = snap.size;
      recompute();
    });

    const unsubLeads = onSnapshot(collectionGroup(db, 'leads'), (snap) => {
      totalLeads = snap.size;
      recompute();
    });

    const unsubSales = onSnapshot(collectionGroup(db, 'sales'), (snap) => {
      let completed = 0;
      totalRevenue = 0;
      monthlyRevenue = 0;
      snap.docs.forEach((doc) => {
        const d = doc.data();
        if (d.status !== 'completed') return;
        completed++;
        const price = Number(d.price || d.salePrice || d.total || 0);
        totalRevenue += price;
        const createdAt = toDate(d.createdAt);
        if (createdAt >= startOfMonth) monthlyRevenue += price;
      });
      totalSales = completed;
      recompute();
    });

    const unsubSubs = onSnapshot(collection(db, 'subscriptions'), (snap) => {
      activeSubscriptions = 0;
      pastDueSubscriptions = 0;
      suspendedSubscriptions = 0;
      snap.docs.forEach((doc) => {
        const st = doc.data().status as string;
        if (st === 'active' || st === 'trialing') activeSubscriptions++;
        else if (st === 'past_due' || st === 'unpaid') pastDueSubscriptions++;
        else if (st === 'suspended') suspendedSubscriptions++;
      });
      recompute();
    });

    return () => {
      unsubUsers();
      unsubTenants();
      unsubVehicles();
      unsubLeads();
      unsubSales();
      unsubSubs();
    };
  }, []);

  return { stats, loading };
}
