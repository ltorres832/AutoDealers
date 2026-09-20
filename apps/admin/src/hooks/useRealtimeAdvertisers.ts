'use client';

import { useState, useEffect } from 'react';
import { getFirebaseClient } from '@/lib/firebase-client';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

interface Advertiser {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  phone?: string;
  website?: string;
  industry: string;
  status: string;
  plan: string | null;
  registrationSource?: string;
  createdByName?: string;
  assignedAdminId?: string;
  assignedAdminName?: string;
  createdAt: string;
}

export function useRealtimeAdvertisers(options?: { includeCancelled?: boolean }) {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const includeCancelled = options?.includeCancelled === true;

  const applyAdvertiserFilter = (rows: Advertiser[]) =>
    includeCancelled ? rows : rows.filter((row) => row.status !== 'cancelled');

  useEffect(() => {
    const client = getFirebaseClient();
    if (!client) {
      fetchAdvertisers();
      const interval = setInterval(fetchAdvertisers, 5000);
      return () => clearInterval(interval);
    }

    const { db } = client;
    const q = query(collection(db, 'advertisers'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const allAdvertisers = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
        };
      });

      setAdvertisers(applyAdvertiserFilter(allAdvertisers));
      setLoading(false);
    }, (error: any) => {
      console.error('Error en listener de anunciantes:', error);
      fetchAdvertisers();
      setLoading(false);
    });

    return () => unsubscribe();
  }, [includeCancelled]);

  async function fetchAdvertisers() {
    try {
      const response = await fetch('/api/admin/advertisers');
      if (response.ok) {
        const data = await response.json();
        setAdvertisers(applyAdvertiserFilter(data.advertisers || []));
      }
    } catch (error) {
      console.error('Error fetching advertisers:', error);
    } finally {
      setLoading(false);
    }
  }

  return { advertisers, loading };
}

