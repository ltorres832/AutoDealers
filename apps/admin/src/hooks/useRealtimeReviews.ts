'use client';

import { useState, useEffect } from 'react';
import { getFirebaseClient } from '@/lib/firebase-client';
import { collectionGroup, query, where, orderBy, onSnapshot } from 'firebase/firestore';

interface Review {
  id: string;
  tenantId: string;
  tenantName?: string;
  tenantSubdomain?: string;
  tenantType?: string;
  tenantCompanyName?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  rating: number;
  title?: string;
  comment: string;
  vehicleId?: string;
  saleId?: string;
  status: 'pending' | 'approved' | 'rejected';
  featured: boolean;
  response?: {
    text: string;
    respondedBy: string;
    respondedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface UseRealtimeReviewsOptions {
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  tenantId?: string;
}

export function useRealtimeReviews(options: UseRealtimeReviewsOptions = {}) {
  const { status = 'all', tenantId } = options;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getFirebaseClient();
    if (!client) {
      // Fallback a polling si Firebase no está disponible
      fetchReviews();
      const interval = setInterval(fetchReviews, 5000);
      return () => clearInterval(interval);
    }

    const { db } = client;

    // Construir query base
    let q: any = collectionGroup(db, 'reviews');

    // Aplicar filtros
    if (status !== 'all') {
      q = query(q, where('status', '==', status));
    }

    // Ordenar por fecha
    q = query(q, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot: any) => {
      const allReviews: Review[] = [];

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
        // Obtener información del tenant
        const tenantPath = docSnapshot.ref.path.split('/');
        const reviewTenantId = tenantPath[1];
        
        // Filtrar por tenantId si se especifica
        if (tenantId && reviewTenantId !== tenantId) {
          continue;
        }

        // Obtener información del tenant
        let tenantName = '';
        let tenantSubdomain = '';
        let tenantType = '';
        let tenantCompanyName = '';

        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const tenantRef = doc(db, 'tenants', reviewTenantId);
          const tenantSnap = await getDoc(tenantRef);
          if (tenantSnap.exists()) {
            const tenantData = tenantSnap.data();
            tenantName = tenantData?.name || '';
            tenantSubdomain = tenantData?.subdomain || '';
            tenantType = tenantData?.type || '';
            tenantCompanyName = tenantData?.companyName || '';
          }
        } catch (error) {
          console.error('Error fetching tenant:', error);
        }

        allReviews.push({
          id: docSnapshot.id,
          tenantId: reviewTenantId,
          tenantName,
          tenantSubdomain,
          tenantType,
          tenantCompanyName,
          customerName: data.customerName || 'Cliente',
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          rating: data.rating || 5,
          title: data.title,
          comment: data.comment || '',
          vehicleId: data.vehicleId,
          saleId: data.saleId,
          status: data.status || 'pending',
          featured: data.featured || false,
          response: data.response ? {
            text: data.response.text,
            respondedBy: data.response.respondedBy,
            respondedAt: data.response.respondedAt?.toDate()?.toISOString() || new Date().toISOString(),
          } : undefined,
          createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
        });
      }

      setReviews(allReviews);
      setLoading(false);
    }, (error: any) => {
      console.error('Error en listener de reseñas:', error);
      // Fallback a polling
      fetchReviews();
      setLoading(false);
    });

    return () => unsubscribe();
  }, [status, tenantId]);

  async function fetchReviews() {
    try {
      const params = new URLSearchParams();
      if (status !== 'all') {
        params.append('status', status);
      }
      if (tenantId) {
        params.append('tenantId', tenantId);
      } else {
        params.append('allTenants', 'true');
      }

      const response = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  return { reviews, loading };
}

