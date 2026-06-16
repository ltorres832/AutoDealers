'use client';

// Modal avanzado para revisar solicitudes F&I con todas las funcionalidades mejoradas

import { useState, useEffect } from 'react';
import FICalculator from './FICalculator';
import FIApprovalScore from './FIApprovalScore';
import FICreditReport from './FICreditReport';
import FIFinancingComparison from './FIFinancingComparison';
import FICosignerForm from './FICosignerForm';
import { getCosignerTotalMonthlyIncome, getFITotalMonthlyIncome } from '@autodealers/crm';

interface FIRequest {
  id: string;
  clientId: string;
  status: string;
  employment: any;
  creditInfo: any;
  personalInfo: any;
  vehicleInfo?: any;
  sellerNotes?: string;
  fiManagerNotes?: string;
  internalNotes?: string;
  submittedAt?: string;
  reviewedAt?: string;
  createdBy: string;
  financingCalculation?: any;
  approvalScore?: any;
  notes?: Array<{ by: string; byName: string; timestamp: Date; content: string; isInternal: boolean }>;
  requestedDocuments?: Array<{ type: string; name: string; status: string; receivedAt?: Date }>;
  history?: Array<{ action: string; performedBy: string; timestamp: Date; notes?: string }>;
  cosigner?: any;
  combinedScore?: number;
}

interface FIClient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  vehiclePrice?: number;
  downPayment?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
}

interface AdvancedFIRequestReviewModalProps {
  request: FIRequest;
  client: FIClient | null;
  onClose: () => void;
  onStatusChange: (requestId: string, newStatus: string, notes?: string, internalNotes?: string) => Promise<void>;
  onRequestDocuments: (requestId: string, documents: Array<{ type: string; name: string; required: boolean }>) => Promise<void>;
  onSendExternalEmail: (
    requestId: string,
    email: {
      to: string;
      subject: string;
      body: string;
      attachPdf?: boolean;
      pdfTemplate?: string;
    }
  ) => Promise<void>;
}

export default function AdvancedFIRequestReviewModal({
  request,
  client,
  onClose,
  onStatusChange,
  onRequestDocuments,
  onSendExternalEmail,
}: AdvancedFIRequestReviewModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'documents' | 'history' | 'actions'>('overview');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [showRequestDocuments, setShowRequestDocuments] = useState(false);
  const [showExternalEmail, setShowExternalEmail] = useState(false);
  const [requestedDocs, setRequestedDocs] = useState<Array<{ type: string; name: string; required: boolean }>>([]);
  const [externalEmail, setExternalEmail] = useState({ to: '', subject: '', body: '' });
  const [attachPdf, setAttachPdf] = useState(true);
  const [pdfTemplate, setPdfTemplate] = useState('lender_package');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [requestingDocs, setRequestingDocs] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showCosignerForm, setShowCosignerForm] = useState(false);
  const [cosignerFormMode, setCosignerFormMode] = useState<'create' | 'edit'>('create');
  const [localCosigner, setLocalCosigner] = useState<any>(request.cosigner);

  useEffect(() => {
    setLocalCosigner(request.cosigner);
  }, [request.cosigner, request.id]);

  const vehiclePrice = client?.vehiclePrice || request.vehicleInfo?.price || 0;
  const downPayment = client?.downPayment || request.vehicleInfo?.downPayment || 0;
  const monthlyPayment = request.financingCalculation?.monthlyPayment || 0;

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
      <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const handleStatusChangeWithNotes = async (newStatus: string) => {
    setActionLoading(true);
    try {
      await onStatusChange(request.id, newStatus, notes || undefined, internalNotes || undefined);
      setNotes('');
      setInternalNotes('');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestDocuments = async () => {
    if (requestedDocs.length === 0) {
      alert('Selecciona al menos un documento');
      return;
    }

    setRequestingDocs(true);
    try {
      await onRequestDocuments(request.id, requestedDocs);
      setShowRequestDocuments(false);
      setRequestedDocs([]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setRequestingDocs(false);
    }
  };

  const handleSendExternalEmail = async () => {
    if (!externalEmail.to || !externalEmail.subject || !externalEmail.body) {
      alert('Completa todos los campos');
      return;
    }

    setSendingEmail(true);
    try {
      await onSendExternalEmail(request.id, {
        ...externalEmail,
        attachPdf,
        pdfTemplate,
      });
      setShowExternalEmail(false);
      setExternalEmail({ to: '', subject: '', body: '' });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSendingEmail(false);
    }
  };

  async function handleGeneratePdf(template: string, downloadOnly = false) {
    setGeneratingPdf(true);
    try {
      const res = await fetch('/api/fi/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          requestId: request.id,
          template,
          downloadOnly,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error al generar PDF');
        return;
      }
      if (downloadOnly) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `documento-${template}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        alert(`PDF generado: ${data.title || template}`);
        if (data.document?.pdfUrl) {
          window.open(data.document.pdfUrl, '_blank');
        }
      }
    } catch (e) {
      console.error(e);
      alert('Error al generar PDF');
    } finally {
      setGeneratingPdf(false);
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Información del Cliente - Mejorada */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-50 border-2 border-primary-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-primary-900 mb-2">Información del Cliente</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl"></span>
              <span className="text-lg font-semibold text-primary-900">{client?.name || 'N/A'}</span>
            </div>
          </div>
          {getStatusBadge(request.status)}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-primary-600"></span>
              <span className="text-primary-800">{client?.phone || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary-600"></span>
              <span className="text-primary-800">{client?.email || 'N/A'}</span>
            </div>
            {client?.address && (
              <div className="flex items-center gap-2">
                <span className="text-primary-600">📍</span>
                <span className="text-primary-800">{client.address}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            {request.submittedAt && (
              <div className="flex items-center gap-2">
                <span className="text-primary-600"></span>
                <span className="text-primary-800">
                  Enviado: {new Date(request.submittedAt).toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
            {request.reviewedAt && (
              <div className="flex items-center gap-2">
                <span className="text-primary-600"></span>
                <span className="text-primary-800">
                  Revisado: {new Date(request.reviewedAt).toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Información del Vehículo */}
      {(request.vehicleInfo || (client && (client.vehiclePrice || client.vehicleMake))) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">🚗 Información del Vehículo</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Marca:</span>
              <p className="font-medium">{request.vehicleInfo?.make || (client as any)?.vehicleMake || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600">Modelo:</span>
              <p className="font-medium">{request.vehicleInfo?.model || (client as any)?.vehicleModel || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600">Año:</span>
              <p className="font-medium">{request.vehicleInfo?.year || (client as any)?.vehicleYear || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600">Precio:</span>
              <p className="font-medium">${(request.vehicleInfo?.price || client?.vehiclePrice || 0).toLocaleString()}</p>
            </div>
            {request.vehicleInfo?.vin && (
              <div className="md:col-span-2">
                <span className="text-gray-600">VIN:</span>
                <p className="font-medium font-mono text-xs">{request.vehicleInfo.vin}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Información Financiera - Mejorada */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-5">
          <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2">
            <span></span>
            <span>Información Financiera</span>
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-green-700 font-medium">Empleador:</span>
              <span className="text-green-900 font-semibold">{request.employment?.employer || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-700 font-medium">Ingreso Mensual:</span>
              <span className="text-green-900 font-bold text-lg">${request.employment?.monthlyIncome?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-700 font-medium">Tiempo en Empleo:</span>
              <span className="text-green-900 font-semibold">{request.employment?.timeAtJob || 0} meses</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-700 font-medium">Tipo de Ingreso:</span>
              <span className="text-green-900 font-semibold capitalize">{request.employment?.incomeType || 'N/A'}</span>
            </div>
            <div className="pt-3 border-t border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-green-700 font-medium">Rango de Crédito:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${
                  request.creditInfo?.creditRange === 'excellent' ? 'bg-green-200 text-green-800' :
                  request.creditInfo?.creditRange === 'good' ? 'bg-primary-200 text-primary-800' :
                  request.creditInfo?.creditRange === 'fair' ? 'bg-yellow-200 text-yellow-800' :
                  request.creditInfo?.creditRange === 'poor' ? 'bg-orange-200 text-orange-800' :
                  'bg-red-200 text-red-800'
                }`}>
                  {request.creditInfo?.creditRange || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary-50 to-brand-red-bright50 border-2 border-primary-200 rounded-lg p-5">
          <h3 className="font-bold text-primary-900 mb-4 flex items-center gap-2">
            <span>👥</span>
            <span>Información Personal</span>
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-primary-700 font-medium">Estado Civil:</span>
              <span className="text-primary-900 font-semibold capitalize">{request.personalInfo?.maritalStatus || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-primary-700 font-medium">Dependientes:</span>
              <span className="text-primary-900 font-semibold">{request.personalInfo?.dependents || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-primary-700 font-medium">Vivienda:</span>
              <span className="text-primary-900 font-semibold capitalize">{request.personalInfo?.housing || 'N/A'}</span>
            </div>
            {request.personalInfo?.monthlyHousingPayment && (
              <div className="flex justify-between items-center">
                <span className="text-primary-700 font-medium">Pago Mensual Vivienda:</span>
                <span className="text-primary-900 font-semibold">${request.personalInfo.monthlyHousingPayment.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notas del Vendedor */}
      {request.sellerNotes && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <h3 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
            <span>📝</span>
            <span>Notas del Vendedor</span>
          </h3>
          <p className="text-yellow-800">{request.sellerNotes}</p>
        </div>
      )}

      {/* Codeudor */}
      <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-primary-900 flex items-center gap-2">
            <span>👥</span>
            <span>Codeudor (Co-signer)</span>
          </h3>
          {!localCosigner && (
            <button
              type="button"
              onClick={() => {
                setCosignerFormMode('create');
                setShowCosignerForm(true);
              }}
              className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              + Agregar codeudor
            </button>
          )}
          {localCosigner && (
            <button
              type="button"
              onClick={() => {
                setCosignerFormMode('edit');
                setShowCosignerForm(true);
              }}
              className="px-3 py-1.5 text-sm border border-primary-300 text-primary-700 rounded-md hover:bg-primary-100"
            >
              Editar codeudor
            </button>
          )}
        </div>
        {localCosigner ? (
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-primary-900 text-base">{localCosigner.name}</p>
            <p className="text-primary-800">{localCosigner.phone} · {localCosigner.email}</p>
            <p className="text-primary-700 capitalize">Relación: {localCosigner.relationship}</p>
            <p className="text-primary-800">
              Ingreso codeudor: ${getCosignerTotalMonthlyIncome(localCosigner).toLocaleString()}/mes
            </p>
            <p className="text-primary-900 font-medium">
              Ingreso combinado hogar: $
              {(getFITotalMonthlyIncome(request) + getCosignerTotalMonthlyIncome(localCosigner)).toLocaleString()}
              /mes
            </p>
            {request.combinedScore != null && (
              <p className="text-primary-700">Score combinado: {request.combinedScore}</p>
            )}
          </div>
        ) : (
          <p className="text-primary-700 text-sm">
            Sin codeudor registrado. Agregue la información completa si el cliente utilizará un garante.
          </p>
        )}
      </div>

      {/* Score de Aprobación - Si existe */}
      {request.approvalScore && (
        <div className="bg-white border-2 border-primary-200 rounded-lg p-4">
          <h3 className="font-bold text-gray-900 mb-3">Score de Aprobación</h3>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-primary-600">{request.approvalScore.score}/100</div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full ${
                    request.approvalScore.score >= 75 ? 'bg-green-600' :
                    request.approvalScore.score >= 60 ? 'bg-yellow-600' :
                    request.approvalScore.score >= 45 ? 'bg-orange-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${request.approvalScore.score}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Recomendación: <span className="font-semibold capitalize">{request.approvalScore.recommendation || 'N/A'}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderFinancial = () => (
    <div className="space-y-6">
      {/* Calculadora de Financiamiento */}
      {vehiclePrice > 0 && (
        <FICalculator
          requestId={request.id}
          vehiclePrice={vehiclePrice}
          downPayment={downPayment}
          monthlyIncome={request.employment?.monthlyIncome}
        />
      )}

      {/* Score de Aprobación */}
      {monthlyPayment > 0 && vehiclePrice > 0 && (
        <FIApprovalScore
          requestId={request.id}
          vehiclePrice={vehiclePrice}
          downPayment={downPayment}
          monthlyPayment={monthlyPayment}
        />
      )}

      {/* Comparación de Opciones de Financiamiento */}
      {vehiclePrice > 0 && (
        <FIFinancingComparison
          requestId={request.id}
          vehiclePrice={vehiclePrice}
          downPayment={downPayment}
        />
      )}

      {/* Reporte de Crédito */}
      <FICreditReport
        clientId={request.clientId}
        onReportReceived={(report) => {
          console.log('Credit report received:', report);
        }}
      />
    </div>
  );

  const renderProfessionalPdfSection = () => (
    <div className="rounded-lg border-2 border-primary-200 bg-primary-50/40 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slate-900 text-lg">Documentos PDF profesionales</h4>
          <p className="text-sm text-slate-600 mt-1">
            Genera PDFs con logo y colores de tu concesionario. Configura el branding en{' '}
            <a href="/settings/document-branding" className="text-primary-600 hover:underline font-medium">
              Ajustes → Branding de documentos
            </a>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setExternalEmail({
              to: '',
              subject: `Solicitud de financiamiento — ${client?.name || ''}`.trim(),
              body: `Estimados,\n\nAdjuntamos la solicitud de financiamiento del cliente ${client?.name || ''} para su evaluación crediticia.\n\nQuedamos atentos a su respuesta.\n\nSaludos cordiales.`,
            });
            setShowExternalEmail(true);
          }}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium whitespace-nowrap"
        >
          Enviar a banco / financiera
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {[
          { id: 'lender_package', label: 'Paquete para banco' },
          { id: 'credit_application', label: 'Solicitud de crédito' },
          { id: 'pre_approval_letter', label: 'Carta pre-aprobación' },
          { id: 'financing_summary', label: 'Resumen financiamiento' },
          { id: 'rejection_letter', label: 'Comunicado de decisión' },
          { id: 'terms_agreement', label: 'Acuerdo de términos' },
          { id: 'cosigner_agreement', label: 'Co-signer' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={generatingPdf}
            onClick={() => void handleGeneratePdf(t.id, true)}
            className="text-left px-3 py-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-sm disabled:opacity-50"
          >
            {generatingPdf ? 'Generando…' : `Descargar: ${t.label}`}
          </button>
        ))}
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-8">
      {renderProfessionalPdfSection()}

      <div className="border-t pt-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Documentos del cliente</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Archivos que el cliente sube por link (licencia, comprobantes, etc.)
            </p>
          </div>
          <button
            onClick={() => setShowRequestDocuments(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
          >
            Solicitar al cliente
          </button>
        </div>

        {request.requestedDocuments && request.requestedDocuments.length > 0 ? (
          <div className="space-y-3">
            {request.requestedDocuments.map((doc, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  doc.status === 'received' ? 'bg-green-50 border-green-200' :
                  doc.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                    <p className="text-sm text-gray-600">Tipo: {doc.type}</p>
                    {doc.receivedAt && (
                      <p className="text-xs text-gray-500">
                        Recibido: {new Date(doc.receivedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    doc.status === 'received' ? 'bg-green-200 text-green-800' :
                    doc.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-gray-200 text-gray-800'
                  }`}>
                    {doc.status === 'received' ? 'Recibido' : doc.status === 'pending' ? 'Pendiente' : 'No Recibido'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500 text-sm">Aún no has pedido documentos al cliente por link</p>
            <button
              onClick={() => setShowRequestDocuments(true)}
              className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
            >
              Solicitar documentos al cliente
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">Historial de la Solicitud</h3>
      
      {request.history && request.history.length > 0 ? (
        <div className="space-y-4">
          {request.history.map((entry, index) => (
            <div key={index} className="border-l-4 border-primary-500 pl-4 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900 capitalize">{entry.action.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-600">Por: {entry.performedBy}</p>
                  {entry.notes && (
                    <p className="text-sm text-gray-700 mt-1">{entry.notes}</p>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(entry.timestamp).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No hay historial disponible</p>
        </div>
      )}

      {/* Notas */}
      {request.notes && request.notes.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold text-gray-900 mb-3">Notas y Comentarios</h4>
          <div className="space-y-3">
            {request.notes.map((note, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  note.isInternal ? 'bg-red-50 border-red-200' : 'bg-primary-50 border-primary-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{note.byName}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(note.timestamp).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {note.isInternal && (
                    <span className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs font-medium">
                      Interna
                    </span>
                  )}
                </div>
                <p className="text-gray-700">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderActions = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-900">Acciones</h3>

      {/* Notas */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas Públicas (visibles para el vendedor)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Agrega notas que el vendedor pueda ver..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas Internas (solo para F&I)
          </label>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Notas privadas para el equipo F&I..."
          />
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => handleStatusChangeWithNotes('pending_info')}
          disabled={actionLoading}
          className="px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 font-medium"
        >
          Solicitar Info
        </button>
        <button
          onClick={() => handleStatusChangeWithNotes('pre_approved')}
          disabled={actionLoading}
          className="px-4 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 font-medium"
        >
          Pre-Aprobar
        </button>
        <button
          onClick={() => handleStatusChangeWithNotes('approved')}
          disabled={actionLoading}
          className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
        >
          ✓ Aprobar
        </button>
        <button
          onClick={() => handleStatusChangeWithNotes('rejected')}
          disabled={actionLoading}
          className="px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
        >
          ✗ Rechazar
        </button>
      </div>

      {/* Acciones Adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t">
        <button
          onClick={() => setShowRequestDocuments(true)}
          className="px-4 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium flex items-center justify-center gap-2"
        >
          Solicitar documentos al cliente
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className="px-4 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium flex items-center justify-center gap-2"
        >
          PDFs y envío a banco →
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto my-8">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b p-6 z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Revisar Solicitud F&I</h2>
                <p className="text-sm text-gray-600 mt-1">ID: {request.id}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b">
              {[
                { id: 'overview', label: '📊 Resumen', icon: '📊' },
                { id: 'financial', label: '💰 Financiero', icon: '💰' },
                { id: 'documents', label: '📄 PDF y documentos', icon: '' },
                { id: 'history', label: '📜 Historial', icon: '📜' },
                { id: 'actions', label: '⚡ Acciones', icon: '⚡' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'financial' && renderFinancial()}
            {activeTab === 'documents' && renderDocuments()}
            {activeTab === 'history' && renderHistory()}
            {activeTab === 'actions' && renderActions()}
          </div>
        </div>
      </div>

      {/* Modal de Solicitar Documentos */}
      {showRequestDocuments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Solicitar Documentos</h2>
                <button
                  onClick={() => {
                    setShowRequestDocuments(false);
                    setRequestedDocs([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
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
                ].map((doc) => {
                  const isSelected = requestedDocs.some(d => d.type === doc.type);
                  return (
                    <div
                      key={doc.type}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
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
                          <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                          <p className="text-sm text-gray-600">{doc.description}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-5 w-5 text-primary-600"
                        />
                      </div>
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-primary-200">
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
                  onClick={handleRequestDocuments}
                  disabled={requestingDocs || requestedDocs.length === 0}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {requestingDocs ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Enviar Email Externo */}
      {showExternalEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Enviar Email Externo</h2>
                <button
                  onClick={() => {
                    setShowExternalEmail(false);
                    setExternalEmail({ to: '', subject: '', body: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="rounded-lg border border-primary-100 bg-primary-50/60 p-4 space-y-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachPdf}
                      onChange={(e) => setAttachPdf(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-800">
                      <strong>Adjuntar PDF profesional</strong> — paquete para entidad financiera con datos
                      completos del cliente y branding del concesionario.
                    </span>
                  </label>
                  {attachPdf && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Plantilla del adjunto
                      </label>
                      <select
                        value={pdfTemplate}
                        onChange={(e) => setPdfTemplate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="lender_package">Paquete para banco / financiera</option>
                        <option value="credit_application">Solicitud de crédito</option>
                        <option value="financing_summary">Resumen de financiamiento</option>
                        <option value="pre_approval_letter">Carta de pre-aprobación</option>
                      </select>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Ideal para enviar a bancos, cooperativas o aseguradoras. Las respuestas pueden llegar a la
                    plataforma.
                  </p>
                </div>
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
                  onClick={handleSendExternalEmail}
                  disabled={sendingEmail || !externalEmail.to || !externalEmail.subject || !externalEmail.body}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {sendingEmail ? 'Enviando…' : attachPdf ? 'Enviar con PDF adjunto' : 'Enviar Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCosignerForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                {cosignerFormMode === 'edit' ? 'Editar codeudor' : 'Agregar codeudor'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCosignerForm(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <FICosignerForm
              requestId={request.id}
              mode={cosignerFormMode}
              initialCosigner={localCosigner}
              onCancel={() => setShowCosignerForm(false)}
              onCosignerAdded={(cosigner) => {
                setLocalCosigner(cosigner);
                setShowCosignerForm(false);
              }}
              onCosignerUpdated={(cosigner) => {
                setLocalCosigner(cosigner);
                setShowCosignerForm(false);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

