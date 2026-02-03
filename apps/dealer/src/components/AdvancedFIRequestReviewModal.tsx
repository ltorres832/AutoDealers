'use client';

// Modal avanzado para revisar solicitudes F&I con todas las funcionalidades mejoradas

import { useState, useEffect } from 'react';
import FICalculator from './FICalculator';
import FIApprovalScore from './FIApprovalScore';
import FICreditReport from './FICreditReport';
import FIFinancingComparison from './FIFinancingComparison';

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
  onSendExternalEmail: (requestId: string, email: { to: string; subject: string; body: string }) => Promise<void>;
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
  const [actionLoading, setActionLoading] = useState(false);
  const [requestingDocs, setRequestingDocs] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const vehiclePrice = client?.vehiclePrice || request.vehicleInfo?.price || 0;
  const downPayment = client?.downPayment || request.vehicleInfo?.downPayment || 0;
  const monthlyPayment = request.financingCalculation?.monthlyPayment || 0;

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
      await onSendExternalEmail(request.id, externalEmail);
      setShowExternalEmail(false);
      setExternalEmail({ to: '', subject: '', body: '' });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSendingEmail(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Información del Cliente - Mejorada */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-blue-900 mb-2">Información del Cliente</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl"></span>
              <span className="text-lg font-semibold text-blue-900">{client?.name || 'N/A'}</span>
            </div>
          </div>
          {getStatusBadge(request.status)}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-blue-600"></span>
              <span className="text-blue-800">{client?.phone || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600"></span>
              <span className="text-blue-800">{client?.email || 'N/A'}</span>
            </div>
            {client?.address && (
              <div className="flex items-center gap-2">
                <span className="text-blue-600">📍</span>
                <span className="text-blue-800">{client.address}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            {request.submittedAt && (
              <div className="flex items-center gap-2">
                <span className="text-blue-600"></span>
                <span className="text-blue-800">
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
                <span className="text-blue-600"></span>
                <span className="text-blue-800">
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
                  request.creditInfo?.creditRange === 'good' ? 'bg-blue-200 text-blue-800' :
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

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-5">
          <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
            <span>👥</span>
            <span>Información Personal</span>
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-purple-700 font-medium">Estado Civil:</span>
              <span className="text-purple-900 font-semibold capitalize">{request.personalInfo?.maritalStatus || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-purple-700 font-medium">Dependientes:</span>
              <span className="text-purple-900 font-semibold">{request.personalInfo?.dependents || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-purple-700 font-medium">Vivienda:</span>
              <span className="text-purple-900 font-semibold capitalize">{request.personalInfo?.housing || 'N/A'}</span>
            </div>
            {request.personalInfo?.monthlyHousingPayment && (
              <div className="flex justify-between items-center">
                <span className="text-purple-700 font-medium">Pago Mensual Vivienda:</span>
                <span className="text-purple-900 font-semibold">${request.personalInfo.monthlyHousingPayment.toLocaleString()}</span>
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

      {/* Score de Aprobación - Si existe */}
      {request.approvalScore && (
        <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-gray-900 mb-3">Score de Aprobación</h3>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-blue-600">{request.approvalScore.score}/100</div>
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

  const renderDocuments = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">Documentos</h3>
        <button
          onClick={() => setShowRequestDocuments(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Solicitar Documentos
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
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">No hay documentos solicitados aún</p>
          <button
            onClick={() => setShowRequestDocuments(true)}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Solicitar Documentos
          </button>
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">Historial de la Solicitud</h3>
      
      {request.history && request.history.length > 0 ? (
        <div className="space-y-4">
          {request.history.map((entry, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4 pb-4">
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
                  note.isInternal ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium flex items-center justify-center gap-2"
        >
          Solicitar Documentos
        </button>
        <button
          onClick={() => setShowExternalEmail(true)}
          className="px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium flex items-center justify-center gap-2"
        >
          Enviar Email Externo
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
                { id: 'documents', label: 'Documentos', icon: '' },
                { id: 'history', label: '📜 Historial', icon: '📜' },
                { id: 'actions', label: '⚡ Acciones', icon: '⚡' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
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
                        isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
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
                          className="h-5 w-5 text-purple-600"
                        />
                      </div>
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-purple-200">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {sendingEmail ? 'Enviando...' : 'Enviar Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

