// Hook para obtener clientes F&I en tiempo real (Seller)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

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
      console.log('⚠️ useRealtimeFIClients: No tenantId proporcionado');
      setLoading(false);
      return;
    }

    try {
      if (!db) {
        console.error('❌ useRealtimeFIClients: db no está inicializado');
        setLoading(false);
        return;
      }

      console.log('🔍 useRealtimeFIClients: Configurando listener para tenantId:', tenantId);
      console.log('🔍 useRealtimeFIClients: Ruta completa:', `tenants/${tenantId}/fi_clients`);

      // Primero intentar sin orderBy para evitar problemas de índice
      const q = query(
        collection(db, 'tenants', tenantId, 'fi_clients')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot: any) => {
          console.log(`✅ useRealtimeFIClients: Recibidos ${snapshot.size} clientes`);
          const clientsData: FIClient[] = [];
          
          snapshot.forEach((doc: any) => {
            const data = doc.data();
            const clientData: FIClient = {
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
            };
            clientsData.push(clientData);
          });

          // Ordenar por createdAt si está disponible
          clientsData.sort((a, b) => {
            const aTime = a.createdAt instanceof Timestamp 
              ? a.createdAt.toMillis() 
              : a.createdAt instanceof Date 
                ? a.createdAt.getTime() 
                : 0;
            const bTime = b.createdAt instanceof Timestamp 
              ? b.createdAt.toMillis() 
              : b.createdAt instanceof Date 
                ? b.createdAt.getTime() 
                : 0;
            return bTime - aTime; // Más reciente primero
          });

          console.log(`✅ useRealtimeFIClients: ${clientsData.length} clientes procesados`);
          console.log('📋 Clientes:', clientsData.map(c => ({ id: c.id, name: c.name, phone: c.phone })));
          setClients(clientsData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('❌ Error en tiempo real F&I clients:', err);
          console.error('Código de error:', err.code);
          console.error('Mensaje:', err.message);
          console.error('Stack:', err.stack);
          setError(err);
          setLoading(false);
        }
      );

      return () => {
        console.log('🔌 useRealtimeFIClients: Desconectando listener');
        unsubscribe();
      };
    } catch (err) {
      console.error('❌ Error configurando listener F&I clients:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [tenantId]);

  return { clients, loading, error };
}

