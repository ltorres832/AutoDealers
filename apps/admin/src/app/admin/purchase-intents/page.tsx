'use client';

// Dashboard de Purchase Intents y Verificación de Ventas

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtimePurchaseIntents } from '@/hooks/useRealtimePurchaseIntents';

interface PurchaseIntent {
  id: string;
  tenantId: string;
  dealerId: string;
  vehicleId: string;
  clientId: string;
  status: 'pending' | 'verified' | 'rejected' | 'external';
  fraudScore: number;
  fraudFlags: string[];
  purchaseId?: string;
  createdAt: string;
  verifiedAt?: string;
}

export default function PurchaseIntentsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | 'pending' | 'verified' | 'rejected' | 'external',
    fraudLevel: 'all' as 'all' | 'low' | 'medium' | 'high',
  });

  // Usar hook de tiempo real
  const { intents, loading } = useRealtimePurchaseIntents({
    status: filters.status !== 'all' ? filters.status : undefined,
    fraudLevel: filters.fraudLevel !== 'all' ? filters.fraudLevel : undefined,
  });

  const handleVerify = async (intentId: string) => {
    try {
      const response = await fetch(`/api/admin/purchase-intents/${intentId}/verify`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        // No necesitamos recargar, el hook de tiempo real actualizará automáticamente
        alert('Purchase Intent verificado exitosamente');
      } else {
        const error = await response.json();
        alert(error.error || 'Error al verificar');
      }
    } catch (error) {
      console.error('Error verifying intent:', error);
      alert('Error al verificar');
    }
  };

  const handleReject = async (intentId: string, reason: string) => {
    try {
      const response = await fetch(`/api/admin/purchase-intents/${intentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        // No necesitamos recargar, el hook de tiempo real actualizará automáticamente
        alert('Purchase Intent rechazado');
      } else {
        const error = await response.json();
        alert(error.error || 'Error al rechazar');
      }
    } catch (error) {
      console.error('Error rejecting intent:', error);
      alert('Error al rechazar');
    }
  };

  const getFraudLevel = (score: number) => {
    if (score < 31) return { level: 'low', color: 'green', label: 'Normal' };
    if (score < 61) return { level: 'medium', color: 'yellow', label: 'Advertencia' };
    return { level: 'high', color: 'red', label: 'Alto Riesgo' };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Purchase Intents y Verificación</h1>
        <p className="mt-2 text-gray-600">
          Gestiona y verifica todas las ventas del sistema
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="verified">Verificados</option>
              <option value="rejected">Rechazados</option>
              <option value="external">Externos</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nivel de Fraude</label>
            <select
              value={filters.fraudLevel}
              onChange={(e) => setFilters(prev => ({ ...prev, fraudLevel: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">Todos</option>
              <option value="low">Normal (0-30)</option>
              <option value="medium">Advertencia (31-60)</option>
              <option value="high">Alto Riesgo (61-100)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Intents */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : intents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No hay purchase intents con estos filtros</p>
        </div>
      ) : (
        <div className="space-y-4">
          {intents.map((intent) => {
            const fraudInfo = getFraudLevel(intent.fraudScore);
            return (
              <div
                key={intent.id}
                className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Purchase Intent: {intent.id.substring(0, 8)}...
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        intent.status === 'verified' ? 'bg-green-100 text-green-800' :
                        intent.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        intent.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {intent.status === 'verified' ? '✓ Verificado' :
                         intent.status === 'pending' ? 'Pendiente' :
                         intent.status === 'rejected' ? 'Rechazado' :
                         'Externo'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium bg-${fraudInfo.color}-100 text-${fraudInfo.color}-800`}>
                        Fraude: {fraudInfo.label} ({intent.fraudScore})
                      </span>
                    </div>
                    {intent.purchaseId && (
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Purchase ID:</strong> {intent.purchaseId}
                      </p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <p className="font-medium">Dealer ID</p>
                        <p>{intent.dealerId.substring(0, 8)}...</p>
                      </div>
                      <div>
                        <p className="font-medium">Vehicle ID</p>
                        <p>{intent.vehicleId.substring(0, 8)}...</p>
                      </div>
                      <div>
                        <p className="font-medium">Client ID</p>
                        <p>{intent.clientId.substring(0, 8)}...</p>
                      </div>
                      <div>
                        <p className="font-medium">Creado</p>
                        <p>{intent.createdAt instanceof Date 
                          ? intent.createdAt.toLocaleDateString('es-ES')
                          : new Date(intent.createdAt as any).toLocaleDateString('es-ES')}</p>
                      </div>
                    </div>
                    {intent.fraudFlags.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Flags de Fraude:</p>
                        <div className="flex flex-wrap gap-2">
                          {intent.fraudFlags.map((flag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {intent.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleVerify(intent.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        >
                          ✓ Verificar
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Razón del rechazo:');
                            if (reason) {
                              handleReject(intent.id, reason);
                            }
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                        >
                          ✗ Rechazar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

