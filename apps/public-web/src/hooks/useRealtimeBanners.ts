'use client';

import { useState, useEffect } from 'react';
import { getFirebaseClient } from '../lib/firebase-client';
import { collectionGroup, query, where, orderBy, limit as limitQuery, onSnapshot } from 'firebase/firestore';

interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  ctaText: string;
  linkType: 'vehicle' | 'dealer' | 'seller' | 'filter';
  linkValue: string;
  status: string;
  approved: boolean;
  expiresAt?: string;
  createdAt?: string;
}

export function useRealtimeBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getFirebaseClient();
    if (!client) {
      // Fallback a polling si Firebase no está disponible
      fetchBanners();
      const interval = setInterval(fetchBanners, 5000);
      return () => clearInterval(interval);
    }

    const { db } = client;

    // Listener para banners activos y aprobados de todos los tenants
    const bannersRef = collectionGroup(db, 'premium_banners');
    const q = query(
      bannersRef,
      where('status', '==', 'active'),
      where('approved', '==', true),
      orderBy('priority', 'asc'),
      limitQuery(4)
    );

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const now = new Date();
      const activeBanners = snapshot.docs
        .map((doc: any) => {
          const data = doc.data();
          const expiresAt = data.expiresAt?.toDate();
          
          // Filtrar banners expirados
          if (expiresAt && expiresAt <= now) {
            return null;
          }

          return {
            id: doc.id,
            ...data,
            expiresAt: expiresAt?.toISOString(),
            createdAt: data.createdAt?.toDate()?.toISOString(),
          };
        })
        .filter((b: Banner | null) => b !== null);

      setBanners(activeBanners);
      setLoading(false);
    }, (error: any) => {
      console.error('Error en listener de banners:', error);
      // Fallback a polling
      fetchBanners();
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function fetchBanners() {
    try {
      const response = await fetch('/api/public/banners?status=active&limit=4');
      if (response.ok) {
        const data = await response.json();
        setBanners(data.banners || []);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  }

  return { banners, loading };
}

