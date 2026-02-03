'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

interface Promotion {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  isPaid?: boolean;
  promotionScope?: 'vehicle' | 'dealer' | 'seller';
  views?: number;
  clicks?: number;
  [key: string]: any;
}

export function useRealtimePromotions(tenantId: string) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paid: 0,
    totalViews: 0,
    totalClicks: 0,
  });

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const promotionsRef = collection(db, 'tenants', tenantId, 'promotions');
    
    // Query para TODAS las promociones del seller (no solo las pagadas)
    // Incluir promociones regulares y pagadas
    const q = query(
      promotionsRef,
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot: any) => {
        const fetchedPromotions: Promotion[] = [];
        
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          fetchedPromotions.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            startDate: data.startDate?.toDate?.() || data.startDate,
            endDate: data.endDate?.toDate?.() || data.endDate,
            expiresAt: data.expiresAt?.toDate?.() || data.expiresAt,
            paidAt: data.paidAt?.toDate?.() || data.paidAt,
            // Incluir métricas de redes sociales si existen
            socialMetrics: data.socialMetrics || undefined,
            socialPostIds: data.socialPostIds || undefined,
          } as Promotion);
        });

        setPromotions(fetchedPromotions);

        // Calcular estadísticas
        const active = fetchedPromotions.filter((p) => p.status === 'active').length;
        const paid = fetchedPromotions.filter((p) => p.isPaid).length;
        const totalViews = fetchedPromotions.reduce((sum, p) => sum + (p.views || 0), 0);
        const totalClicks = fetchedPromotions.reduce((sum, p) => sum + (p.clicks || 0), 0);

        setStats({
          total: fetchedPromotions.length,
          active,
          paid,
          totalViews,
          totalClicks,
        });

        setLoading(false);
      },
      (error) => {
        console.error('Error en tiempo real de promociones:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId]);

  return { promotions, stats, loading };
}

