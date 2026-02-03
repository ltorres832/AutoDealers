'use client';

import { useEffect, useState } from 'react';

interface MaintenanceMode {
  enabled: boolean;
  message: string;
  currentEnd?: Date;
}

export function MaintenanceBanner() {
  const [maintenance, setMaintenance] = useState<MaintenanceMode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaintenanceMode();
    
    // Verificar cada 30 segundos
    const interval = setInterval(fetchMaintenanceMode, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchMaintenanceMode() {
    try {
      const response = await fetch('/api/maintenance/status?dashboard=dealer', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setMaintenance(data);
      }
    } catch (error) {
      console.error('Error fetching maintenance mode:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !maintenance || !maintenance.enabled) {
    return null;
  }

  const endDate = maintenance.currentEnd ? new Date(maintenance.currentEnd) : null;
  const now = new Date();
  const timeRemaining = endDate ? Math.max(0, endDate.getTime() - now.getTime()) : null;
  
  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="bg-yellow-500 text-white px-4 py-3 shadow-lg z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <svg className="h-5 w-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-semibold">⚠️ Modo de Mantenimiento Activo</p>
            <p className="text-sm">{maintenance.message}</p>
            {endDate && timeRemaining !== null && timeRemaining > 0 && (
              <p className="text-xs mt-1">
                Tiempo estimado de finalización: {endDate.toLocaleString('es-ES')} 
                {timeRemaining > 0 && ` (${formatTimeRemaining(timeRemaining)} restantes)`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


