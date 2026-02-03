'use client';

// Hook para obtener el archivo del cliente en tiempo real

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

export function useRealtimeCustomerFile(customerId: string, saleId?: string) {
  const { user } = useAuth();
  const [customerFile, setCustomerFile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.tenantId || !customerId) {
      setLoading(false);
      return;
    }

    // Buscar customer file por customerId o saleId
    const customerFileRef = doc(db, 'tenants', user.tenantId, 'customer-files', customerId);
    
    const unsubscribe = onSnapshot(
      customerFileRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setCustomerFile({
            id: docSnapshot.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          });
        } else {
          // Si no existe, buscar por saleId
          if (saleId) {
            // Buscar en la colección de customer-files donde saleId coincida
            // Por ahora, solo establecer null si no existe
            setCustomerFile(null);
          } else {
            setCustomerFile(null);
          }
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error en listener de customer file:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.tenantId, customerId, saleId]);

  return { customerFile, loading, error };
}

