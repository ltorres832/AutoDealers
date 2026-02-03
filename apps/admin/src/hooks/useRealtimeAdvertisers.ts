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
  plan: string;
  createdAt: string;
}

export function useRealtimeAdvertisers() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);

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

      setAdvertisers(allAdvertisers);
      setLoading(false);
    }, (error: any) => {
      console.error('Error en listener de anunciantes:', error);
      fetchAdvertisers();
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function fetchAdvertisers() {
    try {
      const response = await fetch('/api/admin/advertisers');
      if (response.ok) {
        const data = await response.json();
        setAdvertisers(data.advertisers || []);
      }
    } catch (error) {
      console.error('Error fetching advertisers:', error);
    } finally {
      setLoading(false);
    }
  }

  return { advertisers, loading };
}

