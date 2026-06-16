'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';

export type DealerSellerLinkStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'revoked';

export interface DealerSellerLinkRow {
  id: string;
  dealerTenantId: string;
  dealerUserId: string;
  dealerName: string;
  sellerUserId: string;
  sellerEmail: string;
  sellerTenantId: string;
  sellerName: string;
  status: DealerSellerLinkStatus;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
  respondedAt?: Date;
}

function mapDoc(doc: { id: string; data: () => Record<string, unknown> }): DealerSellerLinkRow {
  const d = doc.data();
  return {
    id: doc.id,
    dealerTenantId: String(d.dealerTenantId || ''),
    dealerUserId: String(d.dealerUserId || ''),
    dealerName: String(d.dealerName || ''),
    sellerUserId: String(d.sellerUserId || ''),
    sellerEmail: String(d.sellerEmail || ''),
    sellerTenantId: String(d.sellerTenantId || ''),
    sellerName: String(d.sellerName || ''),
    status: (d.status as DealerSellerLinkStatus) || 'pending',
    message: typeof d.message === 'string' ? d.message : undefined,
    createdAt: (d.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    updatedAt: (d.updatedAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    respondedAt: (d.respondedAt as { toDate?: () => Date })?.toDate?.(),
  };
}

export function useRealtimeDealerSellerLinks(sellerUserId?: string) {
  const [links, setLinks] = useState<DealerSellerLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !sellerUserId) {
      setLinks([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'dealer_seller_links'),
      where('sellerUserId', '==', sellerUserId),
      orderBy('updatedAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setLinks(snap.docs.map((doc) => mapDoc(doc)));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('dealer_seller_links listener:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [sellerUserId]);

  const pendingInvites = links.filter((l) => l.status === 'pending');
  const activeLink = links.find((l) => l.status === 'accepted');

  return { links, pendingInvites, activeLink, loading, error };
}
