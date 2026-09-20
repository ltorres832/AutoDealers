'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFirebaseClient } from '../lib/firebase-client';
import { collection, query, where, limit as limitQuery, onSnapshot } from 'firebase/firestore';
import {
  filterPublicSponsoredContent,
  parseSponsoredContentDate,
} from '@autodealers/core/sponsored-content-visibility';
import { isDemoPromoAccount } from '@/lib/demo-account';

interface SponsoredContent {
  id: string;
  advertiserId: string;
  advertiserName: string;
  type: 'banner' | 'promotion' | 'sponsor';
  placement: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content' | 'vehicle_page';
  title: string;
  description: string;
  imageUrl: string;
  images?: string[];
  animation?: string;
  videoUrl?: string;
  linkUrl: string;
  linkType?:
    | 'external'
    | 'landing_page'
    | 'marketplace'
    | 'inventory'
    | 'contact'
    | 'none';
  impressions: number;
  clicks: number;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

function normalizeSnapshotItem(doc: { id: string; data: () => Record<string, unknown> }): SponsoredContent | null {
  const data = doc.data();
  const item = {
    id: doc.id,
    ...data,
    startDate: parseSponsoredContentDate(data.startDate)?.toISOString(),
    endDate: parseSponsoredContentDate(data.endDate)?.toISOString(),
    createdAt: parseSponsoredContentDate(data.createdAt)?.toISOString() || new Date().toISOString(),
  } as SponsoredContent;

  if (isDemoPromoAccount(item as unknown as Record<string, unknown>, item.id)) return null;
  return filterPublicSponsoredContent([item]).length > 0 ? item : null;
}

export function useRealtimeSponsoredContent(
  placement?: SponsoredContent['placement'],
  limit: number = 6
) {
  const [content, setContent] = useState<SponsoredContent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContent = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (placement) params.append('placement', placement);
      params.append('limit', String(limit));
      params.append('includeApproved', 'true');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`/api/public/sponsored-content?${params.toString()}`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setContent(filterPublicSponsoredContent(data.content || []));
      } else {
        setContent([]);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error fetching sponsored content:', error);
      }
      setContent([]);
    } finally {
      setLoading(false);
    }
  }, [placement, limit]);

  useEffect(() => {
    let isMounted = true;

    void fetchContent();
    const poll = setInterval(() => {
      void fetchContent();
    }, 30000);

    const client = getFirebaseClient();
    if (!client) {
      return () => {
        isMounted = false;
        clearInterval(poll);
      };
    }

    const { db } = client;
    const constraints: Parameters<typeof query>[1][] = [
      where('status', 'in', ['active', 'approved']),
    ];
    if (placement) constraints.push(where('placement', '==', placement));
    if (limit) constraints.push(limitQuery(Math.max(limit * 3, limit)));

    const q = query(collection(db, 'sponsored_content'), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isMounted) return;
        const rows = snapshot.docs
          .map((doc) => normalizeSnapshotItem(doc))
          .filter((item): item is SponsoredContent => item !== null)
          .sort((a, b) => {
            const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return db - da;
          })
          .slice(0, limit);
        setContent(rows);
        setLoading(false);
      },
      () => {
        if (!isMounted) return;
        void fetchContent();
      }
    );

    return () => {
      isMounted = false;
      clearInterval(poll);
      unsubscribe();
    };
  }, [placement, limit, fetchContent]);

  return { content, loading };
}
