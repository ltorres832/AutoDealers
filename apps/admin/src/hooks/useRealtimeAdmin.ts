'use client';

import { useState, useEffect } from 'react';

interface AdminStats {
  totalUsers: number;
  totalTenants: number;
  totalVehicles: number;
  totalLeads: number;
  totalSales: number;
  totalRevenue: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  pastDueSubscriptions: number;
  suspendedSubscriptions: number;
}

export function useRealtimeAdminStats() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTenants: 0,
    totalVehicles: 0,
    totalLeads: 0,
    totalSales: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    pastDueSubscriptions: 0,
    suspendedSubscriptions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    
    // Actualizar cada 5 segundos para mantener datos frescos
    const interval = setInterval(fetchStats, 5000);
    
    return () => clearInterval(interval);
  }, []);

  async function fetchStats() {
    try {
      const token = localStorage.getItem('authToken') || 
                    document.cookie.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1];
      
      const response = await fetch('/api/admin/global/stats', {
        cache: 'no-store',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Error obteniendo stats:', error);
    } finally {
      setLoading(false);
    }
  }

  return { stats, loading };
}

