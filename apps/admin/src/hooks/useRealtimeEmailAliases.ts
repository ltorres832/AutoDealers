// Hook para obtener aliases de email en tiempo real (Admin)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, QuerySnapshot } from 'firebase/firestore';
import { EmailAlias } from '@autodealers/core';

export function useRealtimeEmailAliases(dealerId?: string, assignedTo?: string) {
  const [aliases, setAliases] = useState<EmailAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    let q;

    if (dealerId) {
      q = query(
        collection(db, 'email_aliases'),
        where('dealerId', '==', dealerId),
        where('status', '!=', 'deleted'),
        orderBy('createdAt', 'desc')
      );
    } else if (assignedTo) {
      q = query(
        collection(db, 'email_aliases'),
        where('assignedTo', '==', assignedTo),
        where('status', '!=', 'deleted'),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'email_aliases'),
        where('status', '!=', 'deleted'),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot: any) => {
        try {
          const aliasesData = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              suspendedAt: data.suspendedAt?.toDate(),
              reactivatedAt: data.reactivatedAt?.toDate(),
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            } as EmailAlias;
          });
          setAliases(aliasesData);
          setLoading(false);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Error processing aliases'));
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to email aliases:', err);
        setError(err instanceof Error ? err : new Error('Error listening to email aliases'));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [dealerId, assignedTo]);

  return { aliases, loading, error };
}

