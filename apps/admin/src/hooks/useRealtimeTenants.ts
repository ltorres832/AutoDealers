'use client';

import { useState, useEffect, useCallback } from 'react';

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
      const response = await fetch('/api/admin/tenants');
      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        setError(errorData.error || 'Error al cargar tenants');
        setTenants([]);
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

