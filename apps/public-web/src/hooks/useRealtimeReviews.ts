'use client';

import { useState, useEffect } from 'react';
import { getFirebaseClient } from '../lib/firebase-client';
import { collectionGroup, query, where, orderBy, limit as limitQuery, onSnapshot } from 'firebase/firestore';

interface Review {
  id: string;
  customerName: string;
  customerPhoto?: string;
  rating: number;
  comment: string;
  vehicleName?: string;
  dealerName?: string;
  sellerName?: string;
  createdAt: string;
  verified?: boolean;
  tenantId?: string;
}

export function useRealtimeReviews(limit: number = 6) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isMounted = true;
    
    // Timeout para evitar loading infinito
    timeoutId = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
        console.warn('⚠️ Timeout en useRealtimeReviews, deteniendo loading');
      }
    }, 2000); // 2 segundos máximo

    const client = getFirebaseClient();
    if (!client) {
      // Fallback a polling si Firebase no está disponible
      fetchReviews();
      const interval = setInterval(fetchReviews, 5000);
      return () => {
        isMounted = false;
        clearInterval(interval);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    const { db } = client;

    // Listener para reseñas aprobadas de todos los tenants
    const reviewsRef = collectionGroup(db, 'reviews');
    const q = query(
      reviewsRef,
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limitQuery(limit)
    );

    const unsubscribe = onSnapshot(q, async (snapshot: any) => {
      const activeReviews: Review[] = [];

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
        // Obtener información del tenant
        const tenantPath = docSnapshot.ref.path.split('/');
        const tenantId = tenantPath[1];
        
        let vehicleName = '';
        let dealerName = '';
        let sellerName = '';

        // Obtener información del vehículo si existe
        if (data.vehicleId && tenantId) {
          try {
            const { doc, getDoc } = await import('firebase/firestore');
            const vehicleRef = doc(db, 'tenants', tenantId, 'vehicles', data.vehicleId);
            const vehicleSnap = await getDoc(vehicleRef);
            if (vehicleSnap.exists()) {
              const vehicleData = vehicleSnap.data();
              vehicleName = `${vehicleData?.year || ''} ${vehicleData?.make || ''} ${vehicleData?.model || ''}`.trim();
            }
          } catch (error) {
            console.error('Error fetching vehicle:', error);
          }
        }

        // Obtener información del dealer o seller
        if (data.dealerId) {
          try {
            const { doc, getDoc } = await import('firebase/firestore');
            const dealerRef = doc(db, 'users', data.dealerId);
            const dealerSnap = await getDoc(dealerRef);
            if (dealerSnap.exists()) {
              dealerName = dealerSnap.data()?.name || '';
            }
          } catch (error) {
            console.error('Error fetching dealer:', error);
          }
        }

        if (data.sellerId) {
          try {
            const { doc, getDoc } = await import('firebase/firestore');
            const sellerRef = doc(db, 'users', data.sellerId);
            const sellerSnap = await getDoc(sellerRef);
            if (sellerSnap.exists()) {
              sellerName = sellerSnap.data()?.name || '';
            }
          } catch (error) {
            console.error('Error fetching seller:', error);
          }
        }

        activeReviews.push({
          id: docSnapshot.id,
          tenantId,
          customerName: data.customerName || 'Cliente',
          customerPhoto: data.customerPhoto,
          rating: data.rating || 5,
          comment: data.comment || '',
          vehicleName,
          dealerName,
          sellerName,
          createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          verified: data.verified || false,
        });
      }

      setReviews(activeReviews);
      setLoading(false);
      if (timeoutId) clearTimeout(timeoutId);
    }, (error: any) => {
      console.error('Error en listener de reseñas:', error);
      // Fallback a polling
      fetchReviews();
      setLoading(false);
      if (timeoutId) clearTimeout(timeoutId);
    });

    return () => {
      isMounted = false;
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [limit]);

  async function fetchReviews() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 segundos timeout
      
      const response = await fetch(`/api/public/reviews?limit=${limit}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      } else {
        setReviews([]);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching reviews:', error);
      }
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  return { reviews, loading };
}

