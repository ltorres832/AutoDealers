'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  status: string;
  approved?: boolean;
  paid?: boolean;
  paymentStatus?: string;
  views?: number;
  clicks?: number;
  [key: string]: any;
}

export function useRealtimeBanners(tenantId: string, userId: string) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    totalViews: 0,
    totalClicks: 0,
  });

  useEffect(() => {
    if (!tenantId || !userId) {
      setLoading(false);
      return;
    }

    const bannersRef = collection(db, 'tenants', tenantId, 'premium_banners');
    
    // Query para banners del seller (creados por él o asignados a él)
    const q = query(
      bannersRef,
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot: any) => {
        const fetchedBanners: Banner[] = [];
        
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          // Filtrar solo banners del usuario (creados por él o asignados a él)
          if (data.createdBy === userId || data.assignedTo === userId) {
            fetchedBanners.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate?.() || data.createdAt,
              expiresAt: data.expiresAt?.toDate?.() || data.expiresAt,
              paidAt: data.paidAt?.toDate?.() || data.paidAt,
              approvedAt: data.approvedAt?.toDate?.() || data.approvedAt,
            } as Banner);
          }
        });

        setBanners(fetchedBanners);

        // Calcular estadísticas
        const active = fetchedBanners.filter((b) => b.status === 'active' && b.approved).length;
        const pending = fetchedBanners.filter((b) => b.status === 'pending').length;
        const totalViews = fetchedBanners.reduce((sum, b) => sum + (b.views || 0), 0);
        const totalClicks = fetchedBanners.reduce((sum, b) => sum + (b.clicks || 0), 0);

        setStats({
          total: fetchedBanners.length,
          active,
          pending,
          totalViews,
          totalClicks,
        });

        setLoading(false);
      },
      (error) => {
        console.error('Error en tiempo real de banners:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId, userId]);

  return { banners, stats, loading };
}


