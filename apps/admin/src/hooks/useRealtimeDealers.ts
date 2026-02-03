// Hook para obtener dealers en tiempo real (Admin)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, QuerySnapshot } from 'firebase/firestore';
import { Dealer } from '@autodealers/core';

export function useRealtimeDealers(filter?: {
  status?: 'active' | 'suspended' | 'cancelled' | 'pending';
  approvedByAdmin?: boolean;
}) {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    let q: any = collection(db, 'dealers');

    // Construir query con filtros
    const constraints: any[] = [];
    
    if (filter?.status) {
      constraints.push(where('status', '==', filter.status));
    }

    if (filter?.approvedByAdmin !== undefined) {
      constraints.push(where('approvedByAdmin', '==', filter.approvedByAdmin));
    }

    // Aplicar ordenamiento
    constraints.push(orderBy('createdAt', 'desc'));

    // Si hay filtros, aplicar la query completa
    if (constraints.length > 0) {
      q = query(q, ...constraints);
    } else {
      q = query(q, orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot: any) => {
        try {
          const dealersData = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
              dealerId: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              approvedAt: data.approvedAt?.toDate(),
            } as Dealer;
          });
          setDealers(dealersData);
          setLoading(false);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Error processing dealers'));
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to dealers:', err);
        setError(err instanceof Error ? err : new Error('Error listening to dealers'));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filter?.status, filter?.approvedByAdmin]);

  return { dealers, loading, error };
}

