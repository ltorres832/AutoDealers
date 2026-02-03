'use client';

import { useState, useEffect } from 'react';
import { getFirebaseClient } from '../lib/firebase-client';
import { collectionGroup, query, where, orderBy, limit as limitQuery, onSnapshot, doc, getDoc } from 'firebase/firestore';

interface Promotion {
  id: string;
  name: string;
  description: string;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  tenantId: string;
  tenantName?: string;
  vehicleId?: string;
  promotionScope: 'vehicle' | 'dealer' | 'seller';
  imageUrl?: string;
  views: number;
  clicks: number;
  expiresAt?: string;
  isPaid: boolean;
  priority?: number;
  sellerRating?: number;
  sellerRatingCount?: number;
  dealerRating?: number;
  dealerRatingCount?: number;
}

export function useRealtimePromotions(limit: number = 12) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getFirebaseClient();
    if (!client) {
      // Fallback a polling si Firebase no está disponible
      fetchPromotions();
      const interval = setInterval(fetchPromotions, 5000);
      return () => clearInterval(interval);
    }

    const { db } = client;

    // Listener para promociones pagadas activas
    const promotionsRef = collectionGroup(db, 'promotions');
    const q = query(
      promotionsRef,
      where('isPaid', '==', true),
      where('status', '==', 'active'),
      orderBy('priority', 'desc'),
      limitQuery(limit)
    );

    const unsubscribe = onSnapshot(q, async (snapshot: any) => {
      const now = new Date();
      const activePromotions: Promotion[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Filtrar promociones expiradas
        if (data.expiresAt) {
          const expiresAt = data.expiresAt.toDate();
          if (expiresAt <= now) {
            continue;
          }
        }

        // Obtener información del tenant
        const tenantPath = doc.ref.path.split('/');
        const tenantId = tenantPath[1];
        let tenantName = 'Concesionario';

        // Usar Firebase Client SDK en lugar de Firebase Admin
        try {
          const tenantRef = doc(db, 'tenants', tenantId);
          const tenantSnap = await getDoc(tenantRef);
          if (tenantSnap.exists()) {
            const tenantData = tenantSnap.data() as any;
            tenantName = tenantData?.name || tenantName;
          }
        } catch (error) {
          // Si falla, usar tenantId como nombre temporal
          tenantName = tenantId;
        }

        activePromotions.push({
          id: doc.id,
          tenantId,
          tenantName,
          ...data,
          expiresAt: data.expiresAt?.toDate()?.toISOString(),
          startDate: data.startDate?.toDate()?.toISOString(),
        });
      }

      // Ordenar por prioridad
      activePromotions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      setPromotions(activePromotions.slice(0, limit));
      setLoading(false);
    }, (error: any) => {
      console.error('Error en listener de promociones:', error);
      // Fallback a polling
      fetchPromotions();
      setLoading(false);
    });

    return () => unsubscribe();
  }, [limit]);

  async function fetchPromotions() {
    try {
      const response = await fetch(`/api/public/promotions?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        setPromotions(data.promotions || []);
      }
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  }

  return { promotions, loading };
}

