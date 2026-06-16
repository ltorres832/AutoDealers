'use client';

// Página expandida y mejorada para ver detalles de una solicitud F&I
// Incluye calculadora, scoring, co-signers, comparación de opciones, etc.

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import FICalculator from '@/components/FICalculator';
import FIApprovalScore from '@/components/FIApprovalScore';
import FIDocumentPdfPanel from '@/components/FIDocumentPdfPanel';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeFIRequest } from '@/hooks/useRealtimeFIRequest';
import { expeditionStageLabel } from '@autodealers/shared/client';
import FICosignerFullForm from '@/components/FICosignerFullForm';
import { getCosignerTotalMonthlyIncome, getFITotalMonthlyIncome } from '@/lib/fi-income-utils';

interface FIRequest {
  id: string;
  clientId: string;
  status: string;
  customerFileId?: string;
  expeditionStage?: string;
  employment: any;
  creditInfo: any;
  personalInfo: any;
  sellerNotes?: string;
  fiManagerNotes?: string;
  submittedAt?: string;
  reviewedAt?: string;
  createdBy: string;
  history: any[];
  financingCalculation?: any;
  approvalScore?: any;
  cosigner?: any;
  financingOptions?: any[];
}

interface FIClient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehiclePrice?: number;
  downPayment?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
}

export default function FIRequestDetailPage() {
  const params = useParams();
  const requestId = params.id as string;

  const [customerFileIdFromUrl, setCustomerFileIdFromUrl] = useState('');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('customerFileId')?.trim() || '';
    setCustomerFileIdFromUrl(q);
  }, [requestId]);

  const { user, loading: authLoading } = useAuth();
  const { request: liveRequest, loading: rtLoading, error: rtError } = useRealtimeFIRequest(
    user?.tenantId,
    requestId
  );

  const request = liveRequest as FIRequest | null;
  const [client, setClient] = useState<FIClient | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'calculator' | 'score' | 'cosigner' | 'options' | 'documents' | 'history'>('overview');
  const [showCosignerForm, setShowCosignerForm] = useState(false);
  const [cosignerFormMode, setCosignerFormMode] = useState<'create' | 'edit'>('create');
  const linkAttemptRef = useRef(false);

  useEffect(() => {
    if (!customerFileIdFromUrl || !request?.id || request.customerFileId) return;
    if (linkAttemptRef.current) return;
    linkAttemptRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/fi/link-customer-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            customerFileId: customerFileIdFromUrl,
            fiRequestId: request.id,
          }),
        });
        if (!res.ok && !cancelled) {
          linkAttemptRef.current = false;
          const err = await res.json().catch(() => ({}));
          console.warn('No se pudo vincular expediente:', err?.error || res.status);
        }
      } catch (e) {
        linkAttemptRef.current = false;
        console.warn('link-customer-file:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerFileIdFromUrl, request?.id, request?.customerFileId]);

  useEffect(() => {
    if (!request?.clientId) return;
    let cancelled = false;
    (async () => {
      try {
        const clientsResponse = await fetch('/api/fi/clients', { credentials: 'include' });
        if (clientsResponse.ok && !cancelled) {
          const clientsData = await clientsResponse.json();
          const foundClient = clientsData.clients.find((c: FIClient) => c.id === request.clientId);
          setClient(foundClient || null);
        }
      } catch (error) {
        console.error('Error fetching client:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request?.clientId]);

  const handleSubmit = async () => {
    if (!request || request.status !== 'draft') return;

    try {
      const response = await fetch(`/api/fi/requests/${requestId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sellerNotes: request.sellerNotes }),
      });

      if (response.ok) {
        // El listener en tiempo real actualiza el estado
      } else {
        const error = await response.json();
        alert(error.error || 'Error al enviar solicitud');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al enviar solicitud');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      draft: { color: 'bg-gray-500', label: 'Borrador' },
      submitted: { color: 'bg-primary-500', label: 'Enviado' },
      under_review: { color: 'bg-yellow-500', label: 'En Revisión' },
      pre_approved: { color: 'bg-green-500', label: 'Pre-Aprobado' },
      approved: { color: 'bg-green-600', label: 'Aprobado' },
      pending_info: { color: 'bg-orange-500', label: 'Pendiente Info' },
      rejected: { color: 'bg-red-500', label: 'Rechazado' },
    };

    const statusInfo = statusMap[status] || { color: 'bg-gray-500', label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-sm text-white ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const loading = authLoading || rtLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (rtError) {
    return (
      <div className="text-center py-12 px-4 max-w-lg mx-auto">
        <p className="text-red-600 font-medium mb-2">Error al sincronizar con Firestore</p>
        <p className="text-gray-600 text-sm mb-4">{rtError.message}</p>
        <p className="text-gray-500 text-sm mb-4">
          Comprueba tu sesión, las reglas de seguridad y que el módulo F&I esté activo.
        </p>
        <Link href="/fi" className="text-primary-600 hover:text-primary-700">
          Volver a F&I
        </Link>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Solicitud no encontrada</p>
        <Link href="/fi" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          Volver a F&I
        </Link>
      </div>
    );
  }

  const vehiclePrice = client?.vehiclePrice || 0;
  const downPayment = client?.downPayment || 0;
  const monthlyPayment = request.financingCalculation?.monthlyPayment || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/fi" className="text-primary-600 hover:text-primary-700 text-sm">
          ← Volver a F&I
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Solicitud F&I</h1>
          <p className="text-gray-600 mt-1">
            Cliente: {client?.name || 'N/A'} • {client?.phone}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {getStatusBadge(request.status)}
          <span
            className="px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800 border border-primary-200"
            title="Etapa del expediente vinculada al caso de cliente"
          >
            Expedición: {expeditionStageLabel(request.expeditionStage)}
          </span>
          {request.customerFileId && (
            <Link
              href="/customer-files"
              className="text-sm text-primary-600 hover:text-primary-800 underline"
            >
              Ver caso de cliente
            </Link>
          )}
          {request.status === 'draft' && (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Enviar a F&I
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Resumen', icon: '📋' },
            { id: 'calculator', label: 'Calculadora', icon: '💰' },
            { id: 'score', label: 'Score', icon: '🎯' },
            { id: 'cosigner', label: 'Co-signer', icon: '👥' },
            { id: 'options', label: 'Opciones', icon: '📊' },
            { id: 'documents', label: 'PDF y documentos', icon: '📄' },
            { id: 'history', label: 'Historial', icon: '📜' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información Financiera */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">💼 Información Financiera</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Empleador:</span>
                <p className="font-medium">{request.employment?.employer || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Posición:</span>
                <p className="font-medium">{request.employment?.position || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Ingreso Mensual:</span>
                <p className="font-medium text-green-600">${request.employment?.monthlyIncome?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Tiempo en Empleo:</span>
                <p className="font-medium">{request.employment?.timeAtJob || 0} meses</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Tipo de Ingreso:</span>
                <p className="font-medium capitalize">{request.employment?.incomeType || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Crédito:</span>
                <p className="font-medium capitalize">{request.creditInfo?.creditRange || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Información Personal */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">👤 Información Personal</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Estado Civil:</span>
                <p className="font-medium capitalize">{request.personalInfo?.maritalStatus || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Dependientes:</span>
                <p className="font-medium">{request.personalInfo?.dependents || 0}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Vivienda:</span>
                <p className="font-medium capitalize">{request.personalInfo?.housing || 'N/A'}</p>
              </div>
              {request.personalInfo?.monthlyHousingPayment && (
                <div>
                  <span className="text-sm text-gray-500">Pago Mensual Vivienda:</span>
                  <p className="font-medium">${request.personalInfo.monthlyHousingPayment.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Información del Vehículo */}
          {client?.vehicleMake && (
            <div className="bg-white shadow rounded-lg p-6 md:col-span-2">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🚗 Información del Vehículo</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Año</span>
                  <p className="font-medium">{client.vehicleYear}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Marca</span>
                  <p className="font-medium">{client.vehicleMake}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Modelo</span>
                  <p className="font-medium">{client.vehicleModel}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Precio</span>
                  <p className="font-medium text-green-600">${vehiclePrice.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="bg-white shadow rounded-lg p-6 md:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📝 Notas</h2>
            {request.sellerNotes && (
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-700">Notas del Vendedor:</span>
                <p className="mt-1 text-gray-600 bg-primary-50 p-3 rounded">{request.sellerNotes}</p>
              </div>
            )}
            {request.fiManagerNotes && (
              <div>
                <span className="text-sm font-medium text-gray-700">Notas del Gerente F&I:</span>
                <p className="mt-1 text-gray-600 bg-yellow-50 p-3 rounded">{request.fiManagerNotes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'calculator' && vehiclePrice > 0 && downPayment > 0 && (
        <FICalculator
          requestId={requestId}
          vehiclePrice={vehiclePrice}
          downPayment={downPayment}
          monthlyIncome={request.employment?.monthlyIncome}
        />
      )}

      {activeTab === 'score' && vehiclePrice > 0 && downPayment > 0 && monthlyPayment > 0 && (
        <FIApprovalScore
          requestId={requestId}
          vehiclePrice={vehiclePrice}
          downPayment={downPayment}
          monthlyPayment={monthlyPayment}
        />
      )}

      {activeTab === 'cosigner' && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">👥 Codeudor (Co-signer)</h2>
            {!request.cosigner && (
              <button
                onClick={() => {
                  setCosignerFormMode('create');
                  setShowCosignerForm(true);
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                + Agregar codeudor
              </button>
            )}
            {request.cosigner && (
              <button
                onClick={() => {
                  setCosignerFormMode('edit');
                  setShowCosignerForm(true);
                }}
                className="px-4 py-2 border border-primary-300 text-primary-700 rounded-md hover:bg-primary-50"
              >
                Editar codeudor
              </button>
            )}
          </div>
          {request.cosigner ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-lg">{request.cosigner.name}</p>
                <p className="text-sm text-gray-600">{request.cosigner.phone}</p>
                {request.cosigner.phoneAlternate && (
                  <p className="text-sm text-gray-600">Alt: {request.cosigner.phoneAlternate}</p>
                )}
                <p className="text-sm text-gray-600">{request.cosigner.email}</p>
                <p className="text-sm text-gray-600 mt-1 capitalize">
                  Relación: {request.cosigner.relationship}
                </p>
                <span className={`mt-2 inline-block px-2 py-1 rounded text-xs ${
                  request.cosigner.status === 'approved' ? 'bg-green-100 text-green-800' :
                  request.cosigner.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {request.cosigner.status === 'approved' ? 'Aprobado' :
                   request.cosigner.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="border rounded-lg p-3">
                  <p className="font-medium text-gray-900 mb-1">Empleo principal</p>
                  <p>{request.cosigner.employment?.employer || '—'}</p>
                  <p className="text-gray-600">
                    Ingreso: ${request.cosigner.employment?.monthlyIncome?.toLocaleString() || '0'}/mes
                  </p>
                </div>
                <div className="border rounded-lg p-3 bg-primary-50">
                  <p className="font-medium text-primary-900 mb-1">Ingreso total codeudor</p>
                  <p className="text-lg font-semibold text-primary-800">
                    ${getCosignerTotalMonthlyIncome(request.cosigner).toLocaleString()}/mes
                  </p>
                  <p className="text-xs text-primary-700 mt-1">
                    Ingreso combinado hogar: $
                    {(getFITotalMonthlyIncome(request) + getCosignerTotalMonthlyIncome(request.cosigner)).toLocaleString()}
                    /mes
                  </p>
                </div>
              </div>
              {(request.cosigner.additionalEmployments?.length ?? 0) > 0 && (
                <div>
                  <p className="font-medium text-gray-900 mb-2">Empleos adicionales</p>
                  {request.cosigner.additionalEmployments.map((job: any, i: number) => (
                    <p key={i} className="text-sm text-gray-600">
                      {job.employer} — ${job.monthlyIncome?.toLocaleString() || '0'}/mes
                    </p>
                  ))}
                </div>
              )}
              {request.cosigner.personalInfo?.address && (
                <p className="text-sm text-gray-600">
                  Dirección: {request.cosigner.personalInfo.address}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">
              No hay codeudor registrado. Agregue la información completa si el cliente utilizará un garante.
            </p>
          )}
        </div>
      )}

      {showCosignerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                {cosignerFormMode === 'edit' ? 'Editar codeudor' : 'Agregar codeudor'}
              </h3>
              <button
                onClick={() => setShowCosignerForm(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <FICosignerFullForm
              requestId={requestId}
              mode={cosignerFormMode}
              initialCosigner={request.cosigner}
              onCancel={() => setShowCosignerForm(false)}
              onCosignerAdded={() => setShowCosignerForm(false)}
              onCosignerUpdated={() => setShowCosignerForm(false)}
            />
          </div>
        </div>
      )}

      {activeTab === 'options' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Opciones de Financiamiento</h2>
          {request.financingOptions && request.financingOptions.length > 0 ? (
            <div className="space-y-4">
              {request.financingOptions.map((option: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{option.lender}</p>
                      <p className="text-sm text-gray-600">Tasa: {option.interestRate}% • Plazo: {option.term} meses</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">${option.monthlyPayment?.toLocaleString() || '0'}/mes</p>
                      <p className="text-sm text-gray-600">Total: ${option.totalAmount?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No hay opciones de financiamiento disponibles</p>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <FIDocumentPdfPanel requestId={requestId} clientName={client?.name} />
      )}

      {activeTab === 'history' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📜 Historial Completo</h2>
          {request.history && request.history.length > 0 ? (
            <div className="space-y-3">
              {request.history.map((entry, index) => (
                <div key={index} className="border-l-4 border-primary-500 pl-4 py-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">{entry.action}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                  )}
                  {entry.previousStatus && entry.newStatus && (
                    <p className="text-xs text-gray-500 mt-1">
                      {entry.previousStatus} → {entry.newStatus}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No hay historial disponible</p>
          )}
        </div>
      )}
    </div>
  );
}
