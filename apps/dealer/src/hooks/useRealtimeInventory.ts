// Hook para obtener inventario en tiempo real (Dealer)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client-base';
import { collection, query, onSnapshot, orderBy, limit as firestoreLimit } from 'firebase/firestore';

/** Vehículo tal como llega desde Firestore en el panel dealer */
export interface RealtimeInventoryVehicle {
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
  specifications?: { stockNumber?: string };
  publishedOnPublicPage?: boolean;
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
  const [vehicles, setVehicles] = useState<RealtimeInventoryVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!options.tenantId || !db) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Solo orderBy: evita índice compuesto `status` + `createdAt` en subcolección vehicles.
      // Filtros (status, precio, búsqueda) se aplican en cliente.
      let q = query(
        collection(db, 'tenants', options.tenantId, 'vehicles'),
        orderBy('createdAt', 'desc')
      );

      if (options.limit) {
        q = query(q, firestoreLimit(Math.min(options.limit * 4, 500)));
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: RealtimeInventoryVehicle[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            const vehicle = {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            } as RealtimeInventoryVehicle;

            if (options.status && vehicle.status !== options.status) return;
            if (options.make && vehicle.make !== options.make) return;
            if (options.model && !String(vehicle.model || '').includes(options.model)) return;
            if (options.minPrice != null && vehicle.price < options.minPrice) return;
            if (options.maxPrice != null && vehicle.price > options.maxPrice) return;
            if (options.search) {
              const s = options.search.toLowerCase();
              const stock = String(
                vehicle.stockNumber || vehicle.specifications?.stockNumber || ''
              ).toLowerCase();
              if (
                !vehicle.make?.toLowerCase().includes(s) &&
                !vehicle.model?.toLowerCase().includes(s) &&
                !stock.includes(s)
              ) {
                return;
              }
            }
            list.push(vehicle);
          });

          const capped = options.limit ? list.slice(0, options.limit) : list;
          setVehicles(capped);
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
    } catch (err: unknown) {
      console.error('Error configurando listener inventory:', err);
      setError(err instanceof Error ? err.message : 'Error de inventario');
      setLoading(false);
    }
  }, [
    options.tenantId,
    options.status,
    options.make,
    options.model,
    options.minPrice,
    options.maxPrice,
    options.limit,
    options.search,
  ]);

  return { vehicles, loading, error };
}
