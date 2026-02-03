// Hook para obtener inventario en tiempo real (Dealer)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client-base';
import { collection, query, where, onSnapshot, orderBy, limit as firestoreLimit } from 'firebase/firestore';

interface Vehicle {
  id: string;
  tenantId: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  status: string;
  photos: string[];
  mileage?: number;
  condition: string;
  bodyType?: string;
  transmission?: string;
  fuelType?: string;
  driveType?: string;
  stockNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UseRealtimeInventoryOptions {
  tenantId?: string;
  status?: string;
  make?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  search?: string;
}

export function useRealtimeInventory(options: UseRealtimeInventoryOptions = {}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!options.tenantId || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let q: any = query(
        collection(db, 'tenants', options.tenantId, 'vehicles'),
        orderBy('createdAt', 'desc')
      );

      if (options.status) {
        q = query(
          collection(db, 'tenants', options.tenantId, 'vehicles'),
          where('status', '==', options.status),
          orderBy('createdAt', 'desc')
        );
      }

      if (options.limit) {
        q = query(q, firestoreLimit(options.limit));
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot: any) => {
          const vehiclesData: Vehicle[] = [];
          
          snapshot.forEach((doc: any) => {
            const data = doc.data();
            let vehicle: Vehicle = {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            } as Vehicle;

            // Filtrar por búsqueda si se proporciona
            if (options.search) {
              const searchLower = options.search.toLowerCase();
              const matchesMake = vehicle.make?.toLowerCase().includes(searchLower);
              const matchesModel = vehicle.model?.toLowerCase().includes(searchLower);
              const matchesStock = vehicle.stockNumber?.toLowerCase().includes(searchLower);
              
              if (matchesMake || matchesModel || matchesStock) {
                vehiclesData.push(vehicle);
              }
            } else {
              vehiclesData.push(vehicle);
            }

            // Filtrar por precio si se proporciona
            if (options.minPrice && vehicle.price < options.minPrice) {
              return;
            }
            if (options.maxPrice && vehicle.price > options.maxPrice) {
              return;
            }
          });

          setVehicles(vehiclesData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error en tiempo real inventory:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error configurando listener inventory:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [options.tenantId, options.status, options.make, options.model, options.minPrice, options.maxPrice, options.limit, options.search]);

  return { vehicles, loading, error };
}


