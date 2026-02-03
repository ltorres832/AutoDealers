'use client';

import { useEffect, useState } from 'react';

interface MaintenanceMode {
  enabled: boolean;
  message: string;
  currentEnd?: Date;
}

export function MaintenanceScreen() {
  const [maintenance, setMaintenance] = useState<MaintenanceMode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaintenanceMode();
    
    // Verificar cada 10 segundos
    const interval = setInterval(fetchMaintenanceMode, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchMaintenanceMode() {
    try {
      const response = await fetch('/api/admin/maintenance/status', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setMaintenance(data);
        
        // Si el mantenimiento terminó, recargar la página
        if (data.enabled && data.currentEnd) {
          const endDate = new Date(data.currentEnd);
          if (endDate < new Date()) {
            window.location.reload();
          }
        }
      }
    } catch (error) {
      console.error('Error fetching maintenance mode:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!maintenance || !maintenance.enabled) {
    return null;
  }

  const endDate = maintenance.currentEnd ? new Date(maintenance.currentEnd) : null;
  const now = new Date();
  const timeRemaining = endDate ? Math.max(0, endDate.getTime() - now.getTime()) : null;
  
  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} horas y ${minutes} minutos`;
    }
    return `${minutes} minutos`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full text-center">
        <div className="mb-6">
          <svg className="h-24 w-24 mx-auto text-yellow-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🔧 Modo de Mantenimiento
        </h1>
        
        <p className="text-xl text-gray-700 mb-6">
          {maintenance.message || 'La plataforma está en mantenimiento. Por favor, vuelve más tarde.'}
        </p>
        
        {endDate && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 font-semibold mb-2">
              ⏰ Tiempo estimado de finalización:
            </p>
            <p className="text-lg text-blue-900 font-bold">
              {endDate.toLocaleString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {timeRemaining !== null && timeRemaining > 0 && (
              <p className="text-sm text-blue-700 mt-2">
                Tiempo restante: aproximadamente {formatTimeRemaining(timeRemaining)}
              </p>
            )}
          </div>
        )}
        
        <div className="mt-8">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            🔄 Revisar Estado
          </button>
        </div>
        
        <p className="text-sm text-gray-500 mt-6">
          Esta página se actualizará automáticamente cuando el mantenimiento termine.
        </p>
      </div>
    </div>
  );
}


