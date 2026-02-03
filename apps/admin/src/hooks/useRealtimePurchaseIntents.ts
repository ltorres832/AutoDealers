'use client';

// Hook para obtener Purchase Intents en tiempo real

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, orderBy, onSnapshot, Timestamp, QuerySnapshot } from 'firebase/firestore';

interface PurchaseIntent {
  id: string;
  tenantId: string;
  dealerId: string;
  vehicleId: string;
  clientId: string;
  status: 'pending' | 'verified' | 'rejected' | 'external';
  fraudScore: number;
  fraudFlags: string[];
  purchaseId?: string;
  createdAt: Date | Timestamp;
  verifiedAt?: Date | Timestamp;
}

export function useRealtimePurchaseIntents(filters?: {
  status?: string;
  fraudLevel?: string;
}) {
  const [intents, setIntents] = useState<PurchaseIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Obtener todos los tenants y suscribirse a purchase_intents de cada uno
    const tenantsRef = collection(db, 'tenants');
    const unsubscribeFunctions: (() => void)[] = [];

    // Primero obtener la lista de tenants
    const tenantsUnsubscribe = onSnapshot(
      tenantsRef,
      (tenantsSnapshot) => {
        // Limpiar listeners anteriores
        unsubscribeFunctions.forEach(unsub => unsub());
        unsubscribeFunctions.length = 0;

        // Para cada tenant, suscribirse a sus purchase_intents
        tenantsSnapshot.docs.forEach((tenantDoc) => {
          const tenantId = tenantDoc.id;
          let q = query(
            collection(db, 'tenants', tenantId, 'purchase_intents'),
            orderBy('createdAt', 'desc')
          );

          // Aplicar filtros si existen
          if (filters?.status && filters.status !== 'all') {
            q = query(q, where('status', '==', filters.status));
          }

          const unsubscribe = onSnapshot(
            q,
            (snapshot: any) => {
              const allIntents: PurchaseIntent[] = [];

              // Recopilar intents de todos los tenants
              snapshot.docs.forEach((doc: any) => {
                const data = doc.data();
                
                // Filtrar por nivel de fraude si se especifica
                if (filters?.fraudLevel && filters.fraudLevel !== 'all') {
                  const score = data.fraudScore || 0;
                  if (filters.fraudLevel === 'low' && score >= 31) return;
                  if (filters.fraudLevel === 'medium' && (score < 31 || score >= 61)) return;
                  if (filters.fraudLevel === 'high' && score < 61) return;
                }

                allIntents.push({
                  id: doc.id,
                  tenantId,
                  ...data,
                  createdAt: data.createdAt?.toDate() || new Date(),
                  verifiedAt: data.verifiedAt?.toDate(),
                } as PurchaseIntent);
              });

              // Actualizar estado con todos los intents de todos los tenants
              setIntents(prev => {
                // Combinar y deduplicar
                const combined = [...prev.filter(i => i.tenantId !== tenantId), ...allIntents];
                return combined.sort((a: any, b: any) => 
                  (b.createdAt instanceof Date 
                    ? b.createdAt.getTime() 
                    : (b.createdAt as any)?.toDate?.() 
                      ? (b.createdAt as any).toDate().getTime()
                      : new Date(b.createdAt as unknown as string | number).getTime()) - 
                  (a.createdAt instanceof Date 
                    ? a.createdAt.getTime() 
                    : (a.createdAt as any)?.toDate?.() 
                      ? (a.createdAt as any).toDate().getTime()
                      : new Date(a.createdAt as unknown as string | number).getTime())
                );
              });

              setLoading(false);
              setError(null);
            },
            (err) => {
              console.error('Error en listener de purchase intents:', err);
              setError(err.message);
              setLoading(false);
            }
          );

          unsubscribeFunctions.push(unsubscribe);
        });
      },
      (err) => {
        console.error('Error obteniendo tenants:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    unsubscribeFunctions.push(tenantsUnsubscribe);

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }, [filters?.status, filters?.fraudLevel]);

  return { intents, loading, error };
}


