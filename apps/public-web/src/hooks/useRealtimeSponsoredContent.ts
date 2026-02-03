'use client';

import { useState, useEffect } from 'react';
import { getFirebaseClient } from '../lib/firebase-client';
import { collection, query, where, limit as limitQuery, onSnapshot } from 'firebase/firestore';

interface SponsoredContent {
  id: string;
  advertiserId: string;
  advertiserName: string;
  type: 'banner' | 'promotion' | 'sponsor';
  placement: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content';
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  linkUrl: string;
  linkType?: 'external' | 'landing_page';
  impressions: number;
  clicks: number;
  status: string;
}

export function useRealtimeSponsoredContent(
  placement?: SponsoredContent['placement'],
  limit: number = 6
) {
  const [content, setContent] = useState<SponsoredContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isMounted = true;
    
    // Timeout para evitar loading infinito - reducido a 2 segundos
    timeoutId = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
        console.warn('⚠️ Timeout en useRealtimeSponsoredContent, deteniendo loading');
      }
    }, 2000); // 2 segundos máximo

    const client = getFirebaseClient();
    if (!client) {
      // Fallback a polling
      fetchContent();
      const interval = setInterval(fetchContent, 5000);
      return () => {
        isMounted = false;
        clearInterval(interval);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    const { db } = client;

    // Construir query: incluir active y approved
    const constraints: any[] = [where('status', 'in', ['active', 'approved'])];
    if (placement) constraints.push(where('placement', '==', placement));
    if (limit) constraints.push(limitQuery(limit));
    const q = query(collection(db, 'sponsored_content'), ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      if (!isMounted) return;
      
      const now = new Date();
      const activeContent = snapshot.docs
        .map((doc: any) => {
          const data = doc.data();
          const startDate = data.startDate?.toDate();
          const endDate = data.endDate?.toDate();

          // Filtrar contenido expirado
          if (startDate && startDate > now) {
            return null;
          }
          if (endDate && endDate < now) {
            return null;
          }

          return {
            id: doc.id,
            ...data,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          };
        })
        .filter((item: SponsoredContent | null) => item !== null)
        .sort((a: any, b: any) => {
          const da = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dbt = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dbt - da;
        });

      setContent(activeContent);
      setLoading(false);
      if (timeoutId) clearTimeout(timeoutId);
    }, (error: any) => {
      if (!isMounted) return;
      console.error('Error en listener de contenido patrocinado:', error);
      fetchContent();
      setLoading(false);
      if (timeoutId) clearTimeout(timeoutId);
    });

    return () => {
      isMounted = false;
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [placement, limit]);

  async function fetchContent() {
    try {
      const params = new URLSearchParams();
      if (placement) {
        params.append('placement', placement);
      }
      params.append('limit', limit.toString());
       // Incluir aprobados para casos donde aún no estén activados pero queremos mostrarlos
       params.append('includeApproved', 'true');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 segundos timeout

      const response = await fetch(`/api/public/sponsored-content?${params.toString()}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setContent(data.content || []);
      } else {
        console.warn('⚠️ Error en respuesta de sponsored-content:', response.status);
        setContent([]);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching sponsored content:', error);
      }
      setContent([]);
    } finally {
      setLoading(false);
    }
  }

  return { content, loading };
}

