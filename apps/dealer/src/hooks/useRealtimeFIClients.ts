// Hook para obtener clientes F&I en tiempo real (Dealer)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client-base';
import { collection, query, onSnapshot, Timestamp } from 'firebase/firestore';

interface FIClient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehiclePrice?: number;
  downPayment?: number;
  createdAt?: Date | Timestamp;
}

export function useRealtimeFIClients(tenantId: string) {
  const [clients, setClients] = useState<FIClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    if (!db) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'tenants', tenantId, 'fi_clients'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const clientsData: FIClient[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          clientsData.push({
            id: doc.id,
            name: data.name || '',
            phone: data.phone || '',
            email: data.email,
            vehicleMake: data.vehicleMake,
            vehicleModel: data.vehicleModel,
            vehicleYear: data.vehicleYear,
            vehiclePrice: data.vehiclePrice,
            downPayment: data.downPayment,
            createdAt: data.createdAt,
          });
        });

        clientsData.sort((a, b) => {
          const aTime =
            a.createdAt instanceof Timestamp
              ? a.createdAt.toMillis()
              : a.createdAt instanceof Date
                ? a.createdAt.getTime()
                : 0;
          const bTime =
            b.createdAt instanceof Timestamp
              ? b.createdAt.toMillis()
              : b.createdAt instanceof Date
                ? b.createdAt.getTime()
                : 0;
          return bTime - aTime;
        });

        setClients(clientsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error en tiempo real F&I clients:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId]);

  return { clients, loading, error };
}
