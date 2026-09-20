'use client';

import { useState, useEffect } from 'react';
import { getFirebaseClient } from '@/lib/firebase-client';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { ensureFirebaseClientAuth } from '@/lib/ensure-firebase-client-auth';

interface SponsoredContent {
  id: string;
  advertiserId: string;
  advertiserName: string;
  type: string;
  placement: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  status: string;
  impressions: number;
  clicks: number;
  createdAt: string;
  campaignName?: string;
  price?: number;
}

interface UseRealtimeSponsoredContentOptions {
  status?: string;
}

export function useRealtimeSponsoredContent(options: UseRealtimeSponsoredContentOptions = {}) {
  const { status } = options;
  const [content, setContent] = useState<SponsoredContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      await ensureFirebaseClientAuth().catch(() => undefined);
      if (cancelled) return;

      const client = getFirebaseClient();
      if (!client) {
        void fetchContent();
        const interval = setInterval(fetchContent, 5000);
        return () => clearInterval(interval);
      }

      const { db } = client;
      let q = query(collection(db, 'sponsored_content'), orderBy('createdAt', 'desc'));
      if (status) {
        const normalized =
          status === 'paused'
            ? ['paused', 'suspended']
            : [status];
        if (normalized.length === 1) {
          q = query(
            collection(db, 'sponsored_content'),
            where('status', '==', normalized[0]),
            orderBy('createdAt', 'desc')
          );
        }
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => {
          let rows = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt:
                (data.createdAt as { toDate?: () => Date })?.toDate?.()?.toISOString() ||
                new Date().toISOString(),
            };
          }) as SponsoredContent[];

          if (status === 'paused') {
            rows = rows.filter((row) => row.status === 'paused' || row.status === 'suspended');
          }

          setContent(rows);
          setLoading(false);
        },
        () => {
          void fetchContent();
          setLoading(false);
        }
      );

      return unsubscribe;
    }

    let cleanup: (() => void) | undefined;
    void start().then((unsub) => {
      cleanup = typeof unsub === 'function' ? unsub : undefined;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [status]);

  async function fetchContent() {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);

      const response = await fetchWithAuth(`/api/admin/sponsored-content?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        let rows = (data.content || []) as SponsoredContent[];
        if (status === 'paused') {
          rows = rows.filter((row) => row.status === 'paused' || row.status === 'suspended');
        }
        setContent(rows);
      }
    } catch (error) {
      console.error('Error fetching sponsored content:', error);
    } finally {
      setLoading(false);
    }
  }

  return { content, loading };
}

