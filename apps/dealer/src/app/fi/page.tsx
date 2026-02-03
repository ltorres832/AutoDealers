'use client';

// Panel del Gerente F&I para Dealers
// Permite revisar, aprobar/rechazar solicitudes F&I

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRealtimeFIRequests } from '@/hooks/useRealtimeFIRequests';
import { useRealtimeFIClients } from '@/hooks/useRealtimeFIClients';
import FICalculator from '@/components/FICalculator';
import FIApprovalScore from '@/components/FIApprovalScore';
import FICreditReport from '@/components/FICreditReport';
import AdvancedFIRequestReviewModal from '@/components/AdvancedFIRequestReviewModal';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

interface FIRequest {
  id: string;
  clientId: string;
  status: string;
  employment: any;
  creditInfo: any;
  personalInfo: any;
  sellerNotes?: string;
  fiManagerNotes?: string;
  submittedAt?: string;
  reviewedAt?: string;
  createdBy: string;
}

interface FIClient {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export default function FIFIManagerPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<FIRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [showRequestDocuments, setShowRequestDocuments] = useState(false);
  const [requestedDocs, setRequestedDocs] = useState<Array<{type: string; name: string; description?: string; required: boolean}>>([]);
  const [requestingDocs, setRequestingDocs] = useState(false);
  const [showExternalEmail, setShowExternalEmail] = useState(false);
  const [externalEmail, setExternalEmail] = useState({to: '', subject: '', body: ''});
  const [sendingEmail, setSendingEmail] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Obtener usuario para tenantId
  useEffect(() => {
    fetch('/api/user', { credentials: 'include' })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('✅ Usuario obtenido (Dealer):', data.user);
        setUser(data.user);
      })
      .catch(err => console.error('❌ Error fetching user:', err));
  }, []);

  // Usar hooks de tiempo real
  const { requests, loading: requestsLoading, error: requestsError } = useRealtimeFIRequests(
    user?.tenantId || '',
    filterStatus === 'all' ? undefined : filterStatus
  );
  const { clients, loading: clientsLoading, error: clientsError } = useRealtimeFIClients(user?.tenantId || '');

  // Feature flags - deben estar en el nivel superior del componente
  const calculatorEnabled = useFeatureFlag('fi_calculator', 'dealer');
  const scoringEnabled = useFeatureFlag('fi_scoring', 'dealer');

  // Log para debugging
  useEffect(() => {
    console.log('🔍 FIPage (Dealer): Estado completo');
    console.log('  user:', user);
    console.log('  tenantId:', user?.tenantId);
    console.log('  requests.length:', requests.length);
    console.log('  clients.length:', clients.length);
    console.log('  requestsLoading:', requestsLoading);
    console.log('  clientsLoading:', clientsLoading);
    console.log('  requestsError:', requestsError);
    console.log('  clientsError:', clientsError);
    if (requests.length > 0) {
      console.log('✅ Solicitudes encontradas:', requests.map(r => ({ id: r.id, status: r.status, clientId: r.clientId })));
    }
  }, [user, requests.length, clients.length, requestsLoading, clientsLoading, requestsError, clientsError]);

  const loading = requestsLoading || clientsLoading;

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/fi/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          fiManagerNotes: notes || undefined,
          internalNotes: internalNotes || undefined,
        }),
      });

      if (response.ok) {
        setSelectedRequest(null);
        setNotes('');
        setInternalNotes('');
        // Los datos se actualizarán automáticamente con el hook de tiempo real
      } else {
        const error = await response.json();
        alert(error.error || 'Error al actualizar solicitud');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar solicitud');
    } finally {
      setActionLoading(false);
    }
  };

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

  const getClient = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client && clientId) {
      console.warn(`⚠️ Cliente no encontrado para clientId: ${clientId}. Total clientes cargados: ${clients.length}`);
      if (clients.length > 0) {
        console.log('Clientes disponibles:', clients.map(c => ({ id: c.id, name: c.name })));
      }
    }
    return client;
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
        <h1 className="text-3xl font-bold text-gray-900">Panel F&I</h1>
        <p className="mt-2 text-gray-600">
          Revisa y gestiona solicitudes de Financiamiento e Seguro
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex space-x-4">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-md ${
            filterStatus === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Todas ({requests.length})
        </button>
        <button
          onClick={() => setFilterStatus('submitted')}
          className={`px-4 py-2 rounded-md ${
            filterStatus === 'submitted'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setFilterStatus('under_review')}
          className={`px-4 py-2 rounded-md ${
            filterStatus === 'under_review'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          En Revisión
        </button>
        <button
          onClick={() => setFilterStatus('approved')}
          className={`px-4 py-2 rounded-md ${
            filterStatus === 'approved'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Aprobadas
        </button>
      </div>

      {/* Lista de Solicitudes */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ingreso Mensual
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Crédito
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
              const client = getClient(request.clientId);
              return (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {client?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">{client?.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${request.employment?.monthlyIncome?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {request.creditInfo?.creditRange || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {request.submittedAt
                      ? new Date(request.submittedAt).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedRequest({
                        ...request,
                        submittedAt: request.submittedAt instanceof Date 
                          ? request.submittedAt.toISOString() 
                          : typeof request.submittedAt === 'string' 
                            ? request.submittedAt 
                            : undefined,
                        reviewedAt: request.reviewedAt instanceof Date 
                          ? request.reviewedAt.toISOString() 
                          : typeof request.reviewedAt === 'string' 
                            ? request.reviewedAt 
                            : undefined,
                      } as FIRequest)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Revisar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {requests.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4 text-lg font-semibold">No hay solicitudes</p>
            
            {/* Panel de Debug Visible */}
            <div className="mt-6 bg-white border-2 border-red-300 rounded-lg p-6 max-w-4xl mx-auto text-left">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-red-600">INFORMACIÓN DE DEBUG</h3>
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
                      Consultar Firestore Directamente
                    </button>
                    
                    {debugInfo && (
                      <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4">
                        <p className="font-semibold text-blue-900 mb-2">Resultados de Firestore:</p>
                        {debugInfo.error ? (
                          <p className="text-red-600">Error: {debugInfo.error}</p>
                        ) : (
                          <div className="space-y-2 text-sm">
                            <p><span className="font-semibold">Total solicitudes en Firestore:</span> <span className="font-mono bg-white px-2 py-1 rounded">{debugInfo.totalRequests || 0}</span></p>
                            
                            {debugInfo.allRequests && debugInfo.allRequests.length > 0 && (
                              <div className="mt-3">
                                <p className="font-semibold mb-2">Todas las solicitudes encontradas:</p>
                                <div className="bg-white rounded p-3 max-h-60 overflow-y-auto">
                                  {debugInfo.allRequests.map((req: any, idx: number) => (
                                    <div key={idx} className="mb-2 pb-2 border-b border-gray-200 last:border-0">
                                      <p className="font-mono text-xs">
                                        <span className="font-semibold">ID:</span> {req.id}<br/>
                                        <span className="font-semibold">createdBy:</span> {req.createdBy}<br/>
                                        <span className="font-semibold">status:</span> {req.status}<br/>
                                        <span className="font-semibold">clientId:</span> {req.clientId}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {debugInfo.totalRequests === 0 && (
                              <p className="text-red-600 font-semibold mt-2">NO HAY SOLICITUDES EN FIRESTORE. El problema es que no se están creando las solicitudes.</p>
                            )}
                            
                            {debugInfo.totalRequests > 0 && (
                              <p className="text-green-600 font-semibold mt-2">HAY SOLICITUDES EN FIRESTORE. El problema es que el hook no las está cargando.</p>
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
        )}
      </div>

      {/* Modal de Revisión - Usando componente avanzado */}
      {selectedRequest && (
        <AdvancedFIRequestReviewModal
          request={selectedRequest}
          client={getClient(selectedRequest.clientId) || null}
          onClose={() => {
            setSelectedRequest(null);
            setNotes('');
            setInternalNotes('');
            setShowRequestDocuments(false);
            setShowExternalEmail(false);
          }}
          onStatusChange={async (requestId, newStatus, notes, internalNotes) => {
            await handleStatusChange(requestId, newStatus);
          }}
          onRequestDocuments={async (requestId, documents) => {
            setRequestingDocs(true);
            try {
              const response = await fetch(`/api/fi/requests/${requestId}/request-documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  requestedDocuments: documents,
                  expiresInDays: 7,
                }),
              });

              if (response.ok) {
                const data = await response.json();
                alert(`Solicitud de documentos creada. Link enviado al cliente: ${data.publicUrl}`);
              } else {
                const error = await response.json();
                alert(error.error || 'Error al crear solicitud de documentos');
              }
            } catch (error) {
              console.error('Error:', error);
              alert('Error al crear solicitud de documentos');
            } finally {
              setRequestingDocs(false);
            }
          }}
          onSendExternalEmail={async (requestId, email) => {
            setSendingEmail(true);
            try {
              const response = await fetch(`/api/fi/requests/${requestId}/send-external-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(email),
              });

              if (response.ok) {
                alert('Email enviado correctamente. Las respuestas llegarán a la plataforma.');
              } else {
                const error = await response.json();
                alert(error.error || 'Error al enviar email');
              }
            } catch (error) {
              console.error('Error:', error);
              alert('Error al enviar email');
            } finally {
              setSendingEmail(false);
            }
          }}
        />
      )}

      {/* Modal de Revisión Antiguo - Mantener por compatibilidad pero no se usará */}
      {false && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Revisar Solicitud F&I
                </h2>
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setNotes('');
                    setInternalNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {(() => {
                if (!selectedRequest) return null;
                const request = selectedRequest!; // TypeScript guard - ya verificamos que no es null
                const client = getClient(request.clientId);
                const vehiclePrice = client?.vehiclePrice || 0;
                const downPayment = client?.downPayment || 0;
                const monthlyPayment = (selectedRequest as any).financingCalculation?.monthlyPayment || 0;
                
                return (
                  <div className="space-y-6">
                    {/* Información del Cliente */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">Cliente</h3>
                      <p className="text-blue-700">{client?.name || 'N/A'}</p>
                      <p className="text-sm text-blue-600">{client?.phone}</p>
                      {client?.email && (
                        <p className="text-sm text-blue-600">{client?.email}</p>
                      )}
                    </div>

                    {/* Calculadora y Score */}
                    {(!calculatorEnabled && !scoringEnabled) ? null : (
                      vehiclePrice > 0 && (
                        <div className="grid grid-cols-1 gap-4">
                          {calculatorEnabled && (
                            <FICalculator
                              requestId={request.id}
                              vehiclePrice={vehiclePrice}
                              downPayment={downPayment}
                              monthlyIncome={request.employment?.monthlyIncome}
                            />
                          )}
                          {scoringEnabled && monthlyPayment > 0 && (
                            <FIApprovalScore
                              requestId={request.id}
                              vehiclePrice={vehiclePrice}
                              downPayment={downPayment}
                              monthlyPayment={monthlyPayment}
                            />
                          )}
                        </div>
                      )
                    )}

                    {/* Reporte de Crédito */}
                    <FICreditReport 
                      clientId={request.clientId}
                      onReportReceived={(report) => {
                        // Actualizar el request con el reporte de crédito si es necesario
                        console.log('Credit report received:', report);
                      }}
                    />

                    {/* Información Financiera */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">Información Financiera</h3>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-500">Empleador:</span> {request.employment?.employer || 'N/A'}</p>
                          <p><span className="text-gray-500">Ingreso:</span> ${request.employment?.monthlyIncome?.toLocaleString() || '0'}</p>
                          <p><span className="text-gray-500">Tiempo en Empleo:</span> {request.employment?.timeAtJob || 0} meses</p>
                          <p><span className="text-gray-500">Crédito:</span> <span className="capitalize">{request.creditInfo?.creditRange || 'N/A'}</span></p>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">Información Personal</h3>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-500">Estado Civil:</span> <span className="capitalize">{request.personalInfo?.maritalStatus || 'N/A'}</span></p>
                          <p><span className="text-gray-500">Dependientes:</span> {request.personalInfo?.dependents || 0}</p>
                          <p><span className="text-gray-500">Vivienda:</span> <span className="capitalize">{request.personalInfo?.housing || 'N/A'}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Notas */}
                    {request.sellerNotes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="font-semibold text-yellow-900 mb-2">Notas del Vendedor</h3>
                        <p className="text-yellow-800 text-sm">{request.sellerNotes}</p>
                      </div>
                    )}

                    {/* Formulario de Acción */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notas Públicas (visibles para el vendedor)
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Agrega notas que el vendedor pueda ver..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notas Internas (solo para F&I)
                        </label>
                        <textarea
                          value={internalNotes}
                          onChange={(e) => setInternalNotes(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Notas privadas para el equipo F&I..."
                        />
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex flex-wrap justify-end gap-2 pt-4 border-t">
                      <button
                        onClick={() => {
                          setSelectedRequest(null);
                          setNotes('');
                          setInternalNotes('');
                          setShowRequestDocuments(false);
                          setShowExternalEmail(false);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => setShowRequestDocuments(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                      >
                        📄 Solicitar Documentos
                      </button>
                      <button
                        onClick={() => setShowExternalEmail(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        Enviar Email Externo
                      </button>
                      <button
                        onClick={() => handleStatusChange(request.id, 'pending_info')}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                      >
                        Solicitar Info
                      </button>
                      <button
                        onClick={() => handleStatusChange(request.id, 'pre_approved')}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                      >
                        Pre-Aprobar
                      </button>
                      <button
                        onClick={() => handleStatusChange(request.id, 'approved')}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleStatusChange(request.id, 'rejected')}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Solicitar Documentos */}
      {showRequestDocuments && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Solicitar Documentos
                </h2>
                <button
                  onClick={() => {
                    setShowRequestDocuments(false);
                    setRequestedDocs([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600 mb-4">
                  Selecciona los documentos que necesitas del cliente:
                </p>

                {[
                  { type: 'identification', name: 'Identificación', description: 'Copia de identificación oficial' },
                  { type: 'proof_of_income', name: 'Comprobante de Ingresos', description: 'Comprobantes de ingresos recientes' },
                  { type: 'bank_statement', name: 'Estado de Cuenta Bancario', description: 'Últimos 3 meses' },
                  { type: 'tax_return', name: 'Declaración de Impuestos', description: 'Última declaración anual' },
                  { type: 'employment_letter', name: 'Carta de Empleo', description: 'Carta del empleador' },
                  { type: 'pay_stub', name: 'Recibo de Pago', description: 'Últimos recibos de pago' },
                  { type: 'proof_of_address', name: 'Comprobante de Domicilio', description: 'Recibo de servicios o contrato' },
                  { type: 'insurance', name: 'Seguro', description: 'Póliza de seguro actual' },
                  { type: 'trade_in_title', name: 'Título de Vehículo de Intercambio', description: 'Si aplica' },
                  { type: 'other', name: 'Otro', description: 'Especificar en notas' },
                ].map((doc) => {
                  const isSelected = requestedDocs.some(d => d.type === doc.type);
                  return (
                    <div
                      key={doc.type}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        if (isSelected) {
                          setRequestedDocs(requestedDocs.filter(d => d.type !== doc.type));
                        } else {
                          setRequestedDocs([...requestedDocs, { ...doc, required: false }]);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{doc.name}</h3>
                          {doc.description && (
                            <p className="text-sm text-gray-600">{doc.description}</p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-5 w-5 text-blue-600"
                        />
                      </div>
                      {isSelected && (
                        <div className="mt-2">
                          <label className="flex items-center text-sm">
                            <input
                              type="checkbox"
                              checked={requestedDocs.find(d => d.type === doc.type)?.required || false}
                              onChange={(e) => {
                                setRequestedDocs(requestedDocs.map(d =>
                                  d.type === doc.type ? { ...d, required: e.target.checked } : d
                                ));
                              }}
                              className="mr-2"
                            />
                            Requerido
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end space-x-4 mt-6 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowRequestDocuments(false);
                    setRequestedDocs([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (requestedDocs.length === 0) {
                      alert('Selecciona al menos un documento');
                      return;
                    }

                    if (!selectedRequest) return;
                    setRequestingDocs(true);
                    try {
                      const response = await fetch(`/api/fi/requests/${selectedRequest.id}/request-documents`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          requestedDocuments: requestedDocs,
                          expiresInDays: 7,
                        }),
                      });

                      if (response.ok) {
                        const data = await response.json();
                        alert(`Solicitud de documentos creada. Link enviado al cliente: ${data.publicUrl}`);
                        setShowRequestDocuments(false);
                        setRequestedDocs([]);
                      } else {
                        const error = await response.json();
                        alert(error.error || 'Error al crear solicitud de documentos');
                      }
                    } catch (error) {
                      console.error('Error:', error);
                      alert('Error al crear solicitud de documentos');
                    } finally {
                      setRequestingDocs(false);
                    }
                  }}
                  disabled={requestingDocs || requestedDocs.length === 0}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {requestingDocs ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Enviar Email Externo */}
      {showExternalEmail && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Enviar Email Externo
                </h2>
                <button
                  onClick={() => {
                    setShowExternalEmail(false);
                    setExternalEmail({ to: '', subject: '', body: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Para (Email)
                  </label>
                  <input
                    type="email"
                    value={externalEmail.to}
                    onChange={(e) => setExternalEmail({ ...externalEmail, to: e.target.value })}
                    placeholder="ejemplo@banco.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ejemplo: banco, aseguradora, etc. Las respuestas llegarán a la plataforma.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asunto
                  </label>
                  <input
                    type="text"
                    value={externalEmail.subject}
                    onChange={(e) => setExternalEmail({ ...externalEmail, subject: e.target.value })}
                    placeholder="Solicitud de financiamiento - [Nombre Cliente]"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mensaje
                  </label>
                  <textarea
                    value={externalEmail.body}
                    onChange={(e) => setExternalEmail({ ...externalEmail, body: e.target.value })}
                    rows={8}
                    placeholder="Escribe tu mensaje aquí..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Las respuestas a este email llegarán automáticamente a la plataforma.
                  </p>
                </div>

                {selectedRequest && (() => {
                  const client = getClient(selectedRequest.clientId);
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Cliente:</strong> {client?.name || 'N/A'}
                      </p>
                      <p className="text-sm text-blue-800">
                        <strong>Solicitud ID:</strong> {selectedRequest.id}
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end space-x-4 mt-6 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowExternalEmail(false);
                    setExternalEmail({ to: '', subject: '', body: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!externalEmail.to || !externalEmail.subject || !externalEmail.body) {
                      alert('Completa todos los campos');
                      return;
                    }

                    setSendingEmail(true);
                    try {
                      if (!selectedRequest) return;
                      const response = await fetch(`/api/fi/requests/${selectedRequest.id}/send-external-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(externalEmail),
                      });

                      if (response.ok) {
                        alert('Email enviado correctamente. Las respuestas llegarán a la plataforma.');
                        setShowExternalEmail(false);
                        setExternalEmail({ to: '', subject: '', body: '' });
                      } else {
                        const error = await response.json();
                        alert(error.error || 'Error al enviar email');
                      }
                    } catch (error) {
                      console.error('Error:', error);
                      alert('Error al enviar email');
                    } finally {
                      setSendingEmail(false);
                    }
                  }}
                  disabled={sendingEmail || !externalEmail.to || !externalEmail.subject || !externalEmail.body}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {sendingEmail ? 'Enviando...' : 'Enviar Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

