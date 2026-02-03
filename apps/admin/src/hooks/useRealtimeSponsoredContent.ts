'use client';

import { useState, useEffect } from 'react';
import { getFirebaseClient } from '@/lib/firebase-client';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

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
}

interface UseRealtimeSponsoredContentOptions {
  status?: 'pending' | 'approved' | 'active' | 'paused' | 'expired' | 'rejected';
}

export function useRealtimeSponsoredContent(options: UseRealtimeSponsoredContentOptions = {}) {
  const { status } = options;
  const [content, setContent] = useState<SponsoredContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getFirebaseClient();
    if (!client) {
      fetchContent();
      const interval = setInterval(fetchContent, 5000);
      return () => clearInterval(interval);
    }

    const { db } = client;

    // Construir query
    let q: any = query(collection(db, 'sponsored_content'), orderBy('createdAt', 'desc'));

    if (status) {
      q = query(collection(db, 'sponsored_content'), where('status', '==', status), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const allContent = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
        };
      });

      setContent(allContent);
      setLoading(false);
    }, (error: any) => {
      console.error('Error en listener de contenido patrocinado:', error);
      fetchContent();
      setLoading(false);
    });

    return () => unsubscribe();
  }, [status]);

  async function fetchContent() {
    try {
      const params = new URLSearchParams();
      if (status) {
        params.append('status', status);
      }

      const response = await fetch(`/api/admin/sponsored-content?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setContent(data.content || []);
      }
    } catch (error) {
      console.error('Error fetching sponsored content:', error);
    } finally {
      setLoading(false);
    }
  }

  return { content, loading };
}

