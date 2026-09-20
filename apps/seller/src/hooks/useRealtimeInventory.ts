// Hook para obtener inventario en tiempo real (Seller)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, onSnapshot, orderBy, limit as firestoreLimit } from 'firebase/firestore';

/** Vehículo tal como llega desde Firestore en el panel seller */
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
  videos?: string[];
  generatedVideoUrl?: string;
  mileage?: number;
  condition: string;
  bodyType?: string;
  transmission?: string;
  fuelType?: string;
  driveType?: string;
  stockNumber?: string;
  specifications?: { stockNumber?: string; [key: string]: unknown };
  publishedOnPublicPage?: boolean;
  sellerCommissionType?: 'percentage' | 'fixed';
  sellerCommissionRate?: number;
  sellerCommissionFixed?: number;
  insuranceCommissionType?: 'percentage' | 'fixed';
  insuranceCommissionRate?: number;
  insuranceCommissionFixed?: number;
  accessoriesCommissionType?: 'percentage' | 'fixed';
  accessoriesCommissionRate?: number;
  accessoriesCommissionFixed?: number;
  showSoldBadge?: boolean;
  showPublicSoldBadge?: boolean;
  deleted?: boolean;
  views?: number;
  lastViewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface UseRealtimeInventoryOptions {
  tenantId?: string;
  status?: string;
  limit?: number;
  search?: string;
  /** Tenant adicional (dealer) para vendedores con sync de inventario activo. */
  extraTenantId?: string;
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

    const tenantIds = [options.tenantId];
    if (options.extraTenantId && options.extraTenantId !== options.tenantId) {
      tenantIds.push(options.extraTenantId);
    }

    const byTenant = new Map<string, RealtimeInventoryVehicle[]>();

    const publish = () => {
      const merged: RealtimeInventoryVehicle[] = [];
      const seen = new Set<string>();
      for (const tid of tenantIds) {
        for (const v of byTenant.get(tid) || []) {
          if (seen.has(v.id)) continue;
          seen.add(v.id);
          merged.push(v);
        }
      }
      merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setVehicles(options.limit ? merged.slice(0, options.limit) : merged);
      setLoading(false);
      setError(null);
    };

    try {
      const unsubscribes = tenantIds.map((tid) => {
        let q = query(
          collection(db!, 'tenants', tid, 'vehicles'),
          orderBy('createdAt', 'desc')
        );

        if (options.limit) {
          q = query(q, firestoreLimit(Math.min(options.limit * 4, 500)));
        }

        return onSnapshot(
          q,
          (snapshot) => {
            const list: RealtimeInventoryVehicle[] = [];

            snapshot.forEach((doc) => {
              const data = doc.data();
              const vehicle = {
                id: doc.id,
                ...data,
                tenantId: tid,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
              } as RealtimeInventoryVehicle;

              if (options.status && vehicle.status !== options.status) return;
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

            byTenant.set(tid, list);
            publish();
          },
          (err) => {
            console.error('Error en tiempo real inventory:', err);
            // El tenant adicional (dealer) puede fallar por permisos sin romper el propio
            if (tid === options.tenantId) {
              setError(err.message);
            }
            setLoading(false);
          }
        );
      });

      return () => unsubscribes.forEach((u) => u());
    } catch (err: unknown) {
      console.error('Error configurando listener inventory:', err);
      setError(err instanceof Error ? err.message : 'Error de inventario');
      setLoading(false);
    }
  }, [options.tenantId, options.extraTenantId, options.status, options.limit, options.search]);

  return { vehicles, loading, error };
}
