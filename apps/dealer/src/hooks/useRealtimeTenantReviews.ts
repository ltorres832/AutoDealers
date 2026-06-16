'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase-client-base';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export interface TenantReview {
  id: string;
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
  photos?: string[];
  videos?: string[];
  response?: {
    text: string;
    respondedBy: string;
    respondedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TenantReviewStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
}

function toIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'toDate' in v) {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function computeStats(reviews: TenantReview[]): TenantReviewStats {
  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let approved = 0;
  let pending = 0;
  let rejected = 0;
  let ratingSum = 0;
  let ratingCount = 0;

  reviews.forEach((r) => {
    if (r.status === 'approved') {
      approved++;
      ratingSum += r.rating;
      ratingCount++;
    } else if (r.status === 'pending') pending++;
    else if (r.status === 'rejected') rejected++;
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    ratingDistribution[star] = (ratingDistribution[star] || 0) + 1;
  });

  return {
    total: reviews.length,
    approved,
    pending,
    rejected,
    averageRating: ratingCount > 0 ? ratingSum / ratingCount : 0,
    ratingDistribution,
  };
}

export function useRealtimeTenantReviews(tenantId?: string) {
  const [allReviews, setAllReviews] = useState<TenantReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !db) {
      setAllReviews([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'tenants', tenantId, 'reviews'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows: TenantReview[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          const response = d.response as TenantReview['response'] | undefined;
          return {
            id: doc.id,
            customerName: (d.customerName as string) || 'Cliente',
            customerEmail: d.customerEmail as string | undefined,
            customerPhone: d.customerPhone as string | undefined,
            rating: Number(d.rating) || 0,
            title: d.title as string | undefined,
            comment: (d.comment as string) || '',
            vehicleId: d.vehicleId as string | undefined,
            saleId: d.saleId as string | undefined,
            status: (d.status as TenantReview['status']) || 'pending',
            featured: d.featured === true,
            photos: (d.photos as string[]) || [],
            videos: (d.videos as string[]) || [],
            response: response
              ? {
                  ...response,
                  respondedAt: toIso(response.respondedAt),
                }
              : undefined,
            createdAt: toIso(d.createdAt),
            updatedAt: toIso(d.updatedAt),
          };
        });
        setAllReviews(rows);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error en listener reviews:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId]);

  const stats = useMemo(() => computeStats(allReviews), [allReviews]);

  return { reviews: allReviews, stats, loading, error };
}
