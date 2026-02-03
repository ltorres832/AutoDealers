'use client';

// Página principal del módulo F&I para vendedores
// Permite crear clientes y solicitudes F&I

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRealtimeFIRequests } from '@/hooks/useRealtimeFIRequests';
import { useRealtimeFIClients } from '@/hooks/useRealtimeFIClients';

interface FIClient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehiclePrice?: number;
  downPayment?: number;
}

interface FIRequest {
  id: string;
  clientId: string;
  status: string;
  createdAt: string;
}

export default function FIPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'clients' | 'requests'>('clients');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Obtener usuario para tenantId y userId
  useEffect(() => {
    fetch('/api/user', { credentials: 'include' })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('✅ Usuario obtenido:', data.user);
        console.log('🔍 user.id (userId):', data.user?.id);
        console.log('🔍 tenantId:', data.user?.tenantId);
        setUser(data.user);
      })
      .catch(err => {
        console.error('❌ Error fetching user:', err);
      });
  }, []);

  // Usar hooks de tiempo real
  const { clients, loading: clientsLoading, error: clientsError } = useRealtimeFIClients(user?.tenantId || '');
  
  // TEMPORALMENTE: Mostrar TODAS las solicitudes sin filtrar para debuggear
  // Luego el hook filtrará en memoria si es necesario
  const { requests, loading: requestsLoading, error: requestsError } = useRealtimeFIRequests(
    user?.tenantId || '',
    undefined // TEMPORAL: No filtrar para ver todas las solicitudes
    // user?.id // TODO: Restaurar cuando sepamos que funciona
  );

  // Log para debugging EXTENSIVO
  useEffect(() => {
    console.log('🔍 FIPage: Estado completo del componente');
    console.log('  user:', user);
    console.log('  user?.tenantId:', user?.tenantId);
    console.log('  user?.id:', user?.id);
    console.log('  user?.userId:', user?.userId);
    console.log('  clients.length:', clients.length);
    console.log('  requests.length:', requests.length);
    console.log('  clientsLoading:', clientsLoading);
    console.log('  requestsLoading:', requestsLoading);
    console.log('  clientsError:', clientsError);
    console.log('  requestsError:', requestsError);
    console.log('  requests array completo:', requests);
    
    if (requests.length > 0) {
      console.log('✅ FIPage: Solicitudes encontradas:');
      requests.forEach((req, idx) => {
        console.log(`  [${idx}] ID: ${req.id}, createdBy: ${req.createdBy}, status: ${req.status}, clientId: ${req.clientId}`);
      });
    } else {
      console.warn('⚠️ FIPage: NO HAY SOLICITUDES - requests.length es 0');
      if (!user?.tenantId) {
        console.error('❌ FIPage: PROBLEMA - user.tenantId es undefined/null');
      }
      if (requestsLoading) {
        console.log('⏳ FIPage: Aún cargando solicitudes...');
      }
      if (requestsError) {
        console.error('❌ FIPage: ERROR al cargar solicitudes:', requestsError);
      }
    }
  }, [user, clients.length, requests.length, clientsLoading, requestsLoading, clientsError, requestsError, requests]);

  const loading = clientsLoading || requestsLoading;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      draft: { color: 'bg-gray-500', label: 'Borrador' },
      submitted: { color: 'bg-blue-500', label: 'Enviado' },
      under_review: { color: 'bg-yellow-500', label: 'En Revisión' },
      pre_approved: { color: 'bg-green-500', label: 'Pre-Aprobado' },
      approved: { color: 'bg-green-600', label: 'Aprobado' },
      pending_info: { color: 'bg-orange-500', label: 'Pendiente Info' },
      rejected: { color: 'bg-red-500', label: 'Rechazado' },
    };

    const statusInfo = statusMap[status] || { color: 'bg-gray-500', label: status };
    return (
      <span className={`px-2 py-1 rounded text-xs text-white ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Módulo F&I</h1>
        <p className="mt-2 text-gray-600">
          Gestiona clientes y solicitudes de Financiamiento e Seguro
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('clients')}
            className={`${
              activeTab === 'clients'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Clientes ({clients.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`${
              activeTab === 'requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Solicitudes ({requests.length})
          </button>
        </nav>
      </div>

      {/* Contenido de tabs */}
      {activeTab === 'clients' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Clientes F&I</h2>
            <Link
              href="/fi/clients/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + Nuevo Cliente
            </Link>
          </div>

          {clients.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-4">No hay clientes registrados</p>
              <Link
                href="/fi/clients/new"
                className="text-blue-600 hover:text-blue-700"
              >
                Crear primer cliente →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
                >
                  <h3 className="font-semibold text-lg text-gray-900">{client.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{client.phone}</p>
                  {client.email && (
                    <p className="text-sm text-gray-600">{client.email}</p>
                  )}
                  {client.vehicleMake && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-600">
                        {client.vehicleYear} {client.vehicleMake} {client.vehicleModel}
                      </p>
                      {client.vehiclePrice && (
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          ${client.vehiclePrice.toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="mt-4">
                    <Link
                      href={`/fi/clients/${client.id}/request`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Crear Solicitud F&I →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Solicitudes F&I</h2>

          {requests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-4 text-lg font-semibold">No hay solicitudes F&I</p>
              
              {/* Panel de Debug Visible */}
              <div className="mt-6 bg-white border-2 border-red-300 rounded-lg p-6 max-w-4xl mx-auto text-left">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-red-600">🔍 INFORMACIÓN DE DEBUG</h3>
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                  >
                    {showDebug ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                
                {showDebug && (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-semibold text-gray-700">Estado del Usuario:</p>
                        <p className="text-gray-600">tenantId: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{user?.tenantId || 'NO DEFINIDO'}</span></p>
                        <p className="text-gray-600">userId: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{user?.userId || 'NO DEFINIDO'}</span></p>
                        <p className="text-gray-600">user.id: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{user?.id || 'NO DEFINIDO'}</span></p>
                        <p className="text-gray-600">Rol: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{user?.role || 'NO DEFINIDO'}</span></p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Estado de Carga:</p>
                        <p className="text-gray-600">Loading: <span className={`font-mono px-2 py-1 rounded ${requestsLoading ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{requestsLoading ? 'SÍ' : 'NO'}</span></p>
                        <p className="text-gray-600">Requests encontradas: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{requests.length}</span></p>
                        <p className="text-gray-600">Clients encontrados: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{clients.length}</span></p>
                        {requestsError && (
                          <p className="text-red-600 mt-2">Error: <span className="font-mono bg-red-100 px-2 py-1 rounded">{requestsError.message}</span></p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/fi/debug', { credentials: 'include' });
                            const data = await res.json();
                            setDebugInfo(data.debug);
                          } catch (err: any) {
                            setDebugInfo({ error: err.message });
                          }
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold"
                      >
                        🔍 Consultar Firestore Directamente
                      </button>
                      
                      {debugInfo && (
                        <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4">
                          <p className="font-semibold text-blue-900 mb-2">Resultados de Firestore:</p>
                          {debugInfo.error ? (
                            <p className="text-red-600">Error: {debugInfo.error}</p>
                          ) : (
                            <div className="space-y-2 text-sm">
                              <p><span className="font-semibold">Total solicitudes en Firestore:</span> <span className="font-mono bg-white px-2 py-1 rounded">{debugInfo.totalRequests || 0}</span></p>
                              <p><span className="font-semibold">Filtradas por tu userId:</span> <span className="font-mono bg-white px-2 py-1 rounded">{debugInfo.filteredRequests || 0}</span></p>
                              
                              {debugInfo.allRequests && debugInfo.allRequests.length > 0 && (
                                <div className="mt-3">
                                  <p className="font-semibold mb-2">Todas las solicitudes encontradas:</p>
                                  <div className="bg-white rounded p-3 max-h-60 overflow-y-auto">
                                    {debugInfo.allRequests.map((req: any, idx: number) => (
                                      <div key={idx} className="mb-2 pb-2 border-b border-gray-200 last:border-0">
                                        <p className="font-mono text-xs">
                                          <span className="font-semibold">ID:</span> {req.id}<br/>
                                          <span className="font-semibold">createdBy:</span> <span className={req.createdBy === user?.userId || req.createdBy === user?.id ? 'text-green-600' : 'text-red-600'}>{req.createdBy}</span><br/>
                                          <span className="font-semibold">status:</span> {req.status}<br/>
                                          <span className="font-semibold">clientId:</span> {req.clientId}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {debugInfo.filteredRequestsDetails && debugInfo.filteredRequestsDetails.length > 0 && (
                                <div className="mt-3">
                                  <p className="font-semibold mb-2">Solicitudes filtradas por tu userId:</p>
                                  <div className="bg-white rounded p-3 max-h-60 overflow-y-auto">
                                    {debugInfo.filteredRequestsDetails.map((req: any, idx: number) => (
                                      <div key={idx} className="mb-2 pb-2 border-b border-gray-200 last:border-0">
                                        <p className="font-mono text-xs">
                                          <span className="font-semibold">ID:</span> {req.id}<br/>
                                          <span className="font-semibold">status:</span> {req.status}<br/>
                                          <span className="font-semibold">clientId:</span> {req.clientId}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {debugInfo.totalRequests === 0 && (
                                <p className="text-red-600 font-semibold mt-2">⚠️ NO HAY SOLICITUDES EN FIRESTORE. El problema es que no se están creando las solicitudes.</p>
                              )}
                              
                              {debugInfo.totalRequests > 0 && debugInfo.filteredRequests === 0 && (
                                <div className="mt-2">
                                  <p className="text-orange-600 font-semibold">⚠️ HAY SOLICITUDES PERO NO COINCIDEN CON TU userId</p>
                                  <p className="text-xs text-gray-600 mt-1">Tu userId: {user?.userId || user?.id || 'NO DEFINIDO'}</p>
                                  <p className="text-xs text-gray-600">createdBy en solicitudes: {debugInfo.allRequests?.[0]?.createdBy || 'N/A'}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map((request) => {
                    const client = clients.find((c) => c.id === request.clientId);
                    return (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {client?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">{client?.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(request.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(() => {
                            const createdAt = (request as any).createdAt;
                            if (!createdAt) return 'N/A';
                            const date = createdAt instanceof Date 
                              ? createdAt 
                              : (createdAt as any)?.toDate?.() || new Date(createdAt);
                            return date.toLocaleDateString();
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/fi/requests/${request.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Ver Detalles
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

