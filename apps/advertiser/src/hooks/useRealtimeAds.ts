'use client';

import { useState, useEffect } from 'react';
import { getFirebaseClient } from '@/lib/firebase-client';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

interface Ad {
  id: string;
  advertiserId: string;
  advertiserName: string;
  campaignName?: string;
  type: 'banner' | 'promotion' | 'sponsor';
  placement: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content';
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  linkUrl: string;
  linkType?: 'external' | 'landing_page';
  status: 'pending' | 'approved' | 'active' | 'paused' | 'expired' | 'rejected' | 'payment_pending';
  impressions: number;
  clicks: number;
  conversions: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export function useRealtimeAds(advertiserId: string) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!advertiserId) {
      setLoading(false);
      return;
    }

    const client = getFirebaseClient();
    if (!client) {
      // Fallback a polling si no hay cliente Firebase
      fetchAds();
      const interval = setInterval(fetchAds, 5000);
      return () => clearInterval(interval);
    }

    const { db } = client;

    // Query para obtener todos los anuncios del anunciante
    const q = query(
      collection(db, 'sponsored_content'),
      where('advertiserId', '==', advertiserId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const allAds = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate()?.toISOString(),
          endDate: data.endDate?.toDate()?.toISOString(),
          createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate()?.toISOString(),
        };
      });

      setAds(allAds);
      setLoading(false);
    }, (error: any) => {
      console.error('Error en listener de anuncios:', error);
      fetchAds();
      setLoading(false);
    });

    return () => unsubscribe();
  }, [advertiserId]);

  async function fetchAds() {
    try {
      const response = await fetch('/api/advertiser/ads');
      if (response.ok) {
        const data = await response.json();
        setAds(data.ads || []);
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  }

  return { ads, loading };
}
