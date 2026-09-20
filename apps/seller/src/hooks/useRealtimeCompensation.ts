'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, onSnapshot, query, where, limit as fsLimit } from 'firebase/firestore';

/**
 * Escucha ventas del vendedor en tiempo real para refrescar el portal de compensación.
 */
export function useRealtimeSellerSales(tenantId?: string, sellerId?: string) {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!tenantId || !sellerId || !db) {
      setSales([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'tenants', tenantId, 'sales'),
      where('sellerId', '==', sellerId),
      fsLimit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSales(rows);
        setRevision((n) => n + 1);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [tenantId, sellerId]);

  return { sales, loading, revision };
}
