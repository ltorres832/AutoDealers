'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface Tenant {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  status: string;
  createdAt: string | Date;
  userCount?: number;
  vehicleCount?: number;
  leadCount?: number;
  companyName?: string;
  subdomain?: string;
  avgDealerRating?: number;
  dealerRatingCount?: number;
  avgSellerRating?: number;
  sellerRatingCount?: number;
}

export function useRealtimeTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchWithAuth('/api/admin/tenants', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        const message = errorData.error || 'Error al cargar tenants';
        setError(
          response.status === 401
            ? 'Sesión expirada o sin permisos. Cierra sesión e inicia de nuevo en /login.'
            : message
        );
        setTenants([]);
        if (response.status === 401 && typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2500);
        }
      }
    } catch (err: any) {
      console.error('Error fetching tenants:', err);
      setError(err.message || 'Error al cargar tenants');
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
    
    // Actualizar cada 5 segundos para mantener datos frescos
    const interval = setInterval(fetchTenants, 5000);
    
    return () => clearInterval(interval);
  }, [fetchTenants]);

  return { tenants, loading, error };
}

