'use client';

import { useState, useEffect } from 'react';

interface Subscription {
  id: string;
  tenantId: string;
  userId: string;
  membershipId: string;
  status: string;
  currentPeriodStart: string | Date;
  currentPeriodEnd: string | Date;
  lastPaymentDate?: string | Date;
  nextPaymentDate?: string | Date;
  daysPastDue?: number;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  tenantName?: string;
  userName?: string;
  membershipName?: string;
  amount?: number;
}

export function useRealtimeSubscriptions(filter?: { status?: string }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pastDue: 0,
    suspended: 0,
    cancelled: 0,
  });

  useEffect(() => {
    fetchSubscriptions();
    fetchStats();
    
    // Actualizar cada 5 segundos para mantener datos frescos
    const interval = setInterval(() => {
      fetchSubscriptions();
      fetchStats();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [filter?.status]);

  async function fetchSubscriptions() {
    try {
      const params = new URLSearchParams();
      if (filter?.status && filter.status !== 'all') {
        params.append('status', filter.status);
      }
      const response = await fetch(`/api/admin/subscriptions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch('/api/admin/subscriptions/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  return { subscriptions, stats, loading };
}

