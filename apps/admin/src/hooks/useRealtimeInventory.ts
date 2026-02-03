// Hook para obtener inventario en tiempo real (Admin)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, QuerySnapshot } from 'firebase/firestore';

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
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Construir query base
    let baseQuery: any = collection(db, 'vehicles');

    // Aplicar filtros
    const constraints: any[] = [];

    if (options.tenantId) {
      baseQuery = collection(db, 'tenants', options.tenantId, 'inventory');
    }

    if (options.status) {
      constraints.push(where('status', '==', options.status));
    }

    if (options.make) {
      constraints.push(where('make', '==', options.make));
    }

    if (options.model) {
      constraints.push(where('model', '==', options.model));
    }

    // Ordenar por fecha de creación descendente
    constraints.push(orderBy('createdAt', 'desc'));

    // Construir query final
    const q = constraints.length > 0 ? query(baseQuery, ...constraints) : query(baseQuery, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot: any) => {
        try {
          let vehiclesData = snapshot.docs.map((doc: any) => {
            const data = doc.data() as any;
            return {
              id: doc.id,
              ...data,
              createdAt: data?.createdAt?.toDate() || new Date(),
              updatedAt: data?.updatedAt?.toDate() || new Date(),
            } as Vehicle;
          });

          // Aplicar filtros adicionales en memoria (búsqueda, rango de precios)
          if (options.search) {
            const searchLower = options.search.toLowerCase();
            vehiclesData = vehiclesData.filter(
              (v: any) =>
                v.make.toLowerCase().includes(searchLower) ||
                v.model.toLowerCase().includes(searchLower) ||
                v.stockNumber?.toLowerCase().includes(searchLower)
            );
          }

          if (options.minPrice !== undefined) {
            vehiclesData = vehiclesData.filter((v: any) => v.price >= options.minPrice!);
          }

          if (options.maxPrice !== undefined) {
            vehiclesData = vehiclesData.filter((v: any) => v.price <= options.maxPrice!);
          }

          if (options.limit) {
            vehiclesData = vehiclesData.slice(0, options.limit);
          }

          setVehicles(vehiclesData);
          setLoading(false);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error processing vehicles');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to inventory:', err);
        setError(err instanceof Error ? err.message : 'Error listening to inventory');
        setLoading(false);
      }
    );

    return () => unsubscribe();
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

