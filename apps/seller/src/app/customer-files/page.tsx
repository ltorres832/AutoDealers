'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeCustomerFiles } from '@/hooks/useRealtimeCustomerFiles';
import { expeditionStageLabel } from '@autodealers/crm';

interface CustomerFile {
  id: string;
  saleId: string;
  customerInfo: {
    fullName: string;
    phone: string;
    email: string;
  };
  vehicleId: string;
  sellerInfo?: {
    id: string;
    name: string;
    email: string;
  };
  documents: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedBy: string;
    uploadedAt: string;
  }>;
  requestedDocuments: Array<{
    id: string;
    name: string;
    type: string;
    required: boolean;
    status: 'pending' | 'received' | 'rejected';
    description?: string;
    requestedAt?: string;
  }>;
  uploadToken: string;
  status: 'active' | 'completed' | 'archived' | 'deleted';
  notes: string;
  expeditionStage?: string;
  linkedFiRequestId?: string;
  customerId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price?: number;
}

/** Mismos query params que `/fi/clients/new` para prellenar también el formulario avanzado */
function buildFiPrefillQuery(
  file: Pick<CustomerFile, 'customerInfo' | 'vehicleId'>,
  vehicle?: Vehicle | null
): string {
  const params = new URLSearchParams({
    customerName: file.customerInfo.fullName,
    customerPhone: file.customerInfo.phone,
    customerEmail: file.customerInfo.email || '',
    vehicleId: file.vehicleId,
  });
  if (vehicle) {
    params.set('vehicleMake', vehicle.make || '');
    params.set('vehicleModel', vehicle.model || '');
    params.set('vehicleYear', String(vehicle.year ?? ''));
    if (vehicle.price != null) params.set('vehiclePrice', String(vehicle.price));
  }
  return params.toString();
}

export default function CustomerFilesPage() {
  const { user, loading: authLoading } = useAuth();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'archived'>('all');
  const { files, loading: filesLoading, error: filesError } = useRealtimeCustomerFiles(
    user?.tenantId,
    filter
  );
  const [selectedFile, setSelectedFile] = useState<CustomerFile | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    setSelectedFile((prev) => {
      if (!prev) return prev;
      const fresh = files.find((f) => f.id === prev.id);
      return (fresh as CustomerFile) || prev;
    });
  }, [files]);

  useEffect(() => {
    if (!files.length) return;
    let cancelled = false;
    (async () => {
      const vehicleIds = [...new Set(files.map((f) => f.vehicleId).filter(Boolean))];
      const missing = vehicleIds.filter((id) => !vehicles[id]);
      if (!missing.length) return;
      try {
        const vehiclePromises = missing.map((id) =>
          fetch(`/api/vehicles?id=${id}`, { credentials: 'include' }).then((r) => r.json())
        );
        const vehicleResults = await Promise.all(vehiclePromises);
        if (cancelled) return;
        setVehicles((prev) => {
          const next = { ...prev };
          vehicleResults.forEach((result) => {
            if (result.vehicle) {
              next[result.vehicle.id] = result.vehicle;
            }
          });
          return next;
        });
      } catch (e) {
        console.error('vehicles fetch', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [files]);

  const loading = authLoading || filesLoading;

  async function getUploadLink(fileId: string) {
    try {
      const response = await fetch(`/api/customer-files/${fileId}/upload-link`);
      if (response.ok) {
        const data = await response.json();
        navigator.clipboard.writeText(data.uploadLink);
        alert('Enlace copiado al portapapeles');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar el enlace');
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {filesError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          No se pudo sincronizar en tiempo real: {filesError.message}
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Casos de Cliente</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
        >
          + Crear Caso Manualmente
        </button>
      </div>

      <div
        className="mb-6 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-4 text-sm text-blue-950 shadow-sm"
        role="region"
        aria-label="Colaboración del equipo en casos"
      >
        <p className="font-semibold text-blue-950">Expediente compartido: ventas, gerencia F&amp;I y cliente</p>
        <p className="mt-1 leading-relaxed text-blue-900/90">
          Los documentos que subes aquí son los mismos que el equipo ve en F&amp;I. Copia el enlace de subida para el
          cliente o abre F&amp;I para enviar la solicitud completa — todo queda alineado para el cierre sin perder
          versiones.
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex gap-2">
        {(['all', 'active', 'completed', 'archived'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : f === 'completed' ? 'Completados' : 'Archivados'}
          </button>
        ))}
      </div>

      {/* Lista de Files */}
      {files.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">No hay casos de cliente.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documentos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expedición F&amp;I
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  F&amp;I
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map((file) => {
                const vehicle = vehicles[file.vehicleId];
                const pendingDocs = file.requestedDocuments.filter(rd => rd.status === 'pending').length;
                const receivedDocs = file.documents.length;

                return (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {file.customerInfo.fullName}
                        </div>
                        <div className="text-sm text-gray-500">{file.customerInfo.email}</div>
                        <div className="text-sm text-gray-500">{file.customerInfo.phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {vehicle ? (
                        <div className="text-sm text-gray-900">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Cargando...</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {file.sellerInfo ? (
                        <div className="text-sm text-gray-900">{file.sellerInfo.name}</div>
                      ) : (
                        <div className="text-sm text-gray-500">-</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {receivedDocs} recibido{pendingDocs > 0 && `, ${pendingDocs} pendiente${pendingDocs > 1 ? 's' : ''}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          file.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : file.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {file.status === 'active' ? 'Activo' : file.status === 'completed' ? 'Completado' : 'Archivado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {expeditionStageLabel(file.expeditionStage)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {file.linkedFiRequestId ? (
                        <Link
                          href={`/fi/requests/${file.linkedFiRequestId}`}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Ver solicitud
                        </Link>
                      ) : (
                        <span className="text-gray-400">Sin vincular</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedFile(file);
                          setShowRequestModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        Ver/Editar
                      </button>
                      <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Link
                          href={`/fi/clients/new?${buildFiPrefillQuery(file, vehicles[file.vehicleId])}&customerFileId=${encodeURIComponent(file.id)}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Crear F&amp;I
                        </Link>
                        <Link
                          href={`/fi/clients/advanced?${buildFiPrefillQuery(file, vehicles[file.vehicleId])}&customerFileId=${encodeURIComponent(file.id)}`}
                          className="text-indigo-600 hover:text-indigo-900 text-sm"
                        >
                          Avanzado
                        </Link>
                      </span>
                      <button
                        onClick={() => getUploadLink(file.id)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Copiar Enlace
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Detalles */}
      {selectedFile && showRequestModal && (
        <CustomerFileModal
          file={selectedFile}
          vehicle={vehicles[selectedFile.vehicleId]}
          onClose={() => {
            setSelectedFile(null);
            setShowRequestModal(false);
          }}
          onUpdate={() => {}}
        />
      )}

      {/* Modal de Crear Caso Manualmente */}
      {showCreateModal && (
        <CreateCustomerFileModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
          }}
          onError={(error, details) => {
            setShowCreateModal(false);
            setErrorMessage(error);
            setErrorDetails(details);
          }}
        />
      )}

      {/* Modal de Error */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b bg-red-50">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-red-700">❌ Error al Crear Caso</h2>
                <button 
                  onClick={() => {
                    setErrorMessage(null);
                    setErrorDetails(null);
                  }} 
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Mensaje de Error:</h3>
                <div className="bg-gray-100 p-4 rounded border border-gray-300">
                  <p className="text-gray-800 whitespace-pre-wrap select-all">{errorMessage}</p>
                </div>
              </div>
              {errorDetails && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Detalles:</h3>
                  <div className="bg-gray-100 p-4 rounded border border-gray-300">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap select-all font-mono overflow-x-auto">{errorDetails}</pre>
                  </div>
                </div>
              )}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    const fullError = errorDetails 
                      ? `${errorMessage}\n\n${errorDetails}` 
                      : errorMessage;
                    navigator.clipboard.writeText(fullError).then(() => {
                      alert('✅ Error copiado al portapapeles');
                    }).catch(() => {
                      alert('⚠️ No se pudo copiar. Selecciona el texto manualmente.');
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  📋 Copiar Error
                </button>
                <button
                  onClick={() => {
                    setErrorMessage(null);
                    setErrorDetails(null);
                    setShowCreateModal(true);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  🔄 Intentar de Nuevo
                </button>
                <button
                  onClick={() => {
                    setErrorMessage(null);
                    setErrorDetails(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerFileModal({
  file,
  vehicle,
  onClose,
  onUpdate,
}: {
  file: CustomerFile;
  vehicle?: Vehicle;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({
    name: '',
    type: 'other',
    description: '',
    required: true,
  });

  async function handleRequestDocument(e: React.FormEvent) {
    e.preventDefault();
    try {
      const response = await fetch(`/api/customer-files/${file.id}/request-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestForm),
      });

      if (response.ok) {
        alert('Documento solicitado exitosamente');
        setShowRequestForm(false);
        setRequestForm({ name: '', type: 'other', description: '', required: true });
        onUpdate();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al solicitar documento');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al solicitar documento');
    }
  }

  async function getUploadLink() {
    try {
      const response = await fetch(`/api/customer-files/${file.id}/upload-link`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        navigator.clipboard.writeText(data.uploadLink);
        alert('Enlace copiado al portapapeles');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar el enlace');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">📁 Caso de Cliente</h2>
              <p className="text-blue-100 text-sm mt-1">ID: {file.id}</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl font-bold">
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Información del Cliente */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h3 className="text-lg font-semibold flex-1 min-w-[200px]">Información del Cliente</h3>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/fi/clients/new?${buildFiPrefillQuery(file, vehicle ?? null)}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
                  onClick={onClose}
                >
                  💰 Crear F&amp;I
                </Link>
                <Link
                  href={`/fi/clients/advanced?${buildFiPrefillQuery(file, vehicle ?? null)}`}
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm font-medium"
                  onClick={onClose}
                >
                  📋 F&amp;I avanzado
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nombre</p>
                <p className="font-medium">{file.customerInfo.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{file.customerInfo.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="font-medium">{file.customerInfo.phone}</p>
              </div>
              {vehicle && (
                <div>
                  <p className="text-sm text-gray-600">Vehículo</p>
                  <p className="font-medium">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Enlace de Subida */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-yellow-900">🔗 Enlace de Subida de Documentos</h3>
            <p className="text-sm text-yellow-800 mb-2">Comparte este enlace con el cliente para que pueda subir documentos:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/upload-documents/${file.uploadToken}`}
                readOnly
                className="flex-1 border border-yellow-300 rounded px-3 py-2 bg-white font-mono text-sm"
              />
              <button
                onClick={getUploadLink}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 font-medium"
              >
                📋 Copiar
              </button>
            </div>
            <p className="text-xs text-yellow-700 mt-2">El cliente puede usar este enlace para subir documentos solicitados</p>
          </div>

          {/* Documentos Solicitados */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">📄 Documentos Solicitados</h3>
              <button
                onClick={() => setShowRequestForm(!showRequestForm)}
                className="bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 text-sm font-medium"
              >
                + Solicitar Documento
              </button>
            </div>

            {showRequestForm && (
              <form onSubmit={handleRequestDocument} className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-3">Nueva Solicitud de Documento</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Nombre del Documento *</label>
                    <input
                      type="text"
                      value={requestForm.name}
                      onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Licencia de Conducir"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Tipo</label>
                    <select
                      value={requestForm.type}
                      onChange={(e) => setRequestForm({ ...requestForm, type: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="license">Licencia de Conducir</option>
                      <option value="insurance">Seguro</option>
                      <option value="registration">Registro</option>
                      <option value="identification">Identificación</option>
                      <option value="proof_of_income">Comprobante de Ingresos</option>
                      <option value="bank_statement">Estado de Cuenta</option>
                      <option value="tax_return">Declaración de Impuestos</option>
                      <option value="proof_of_address">Comprobante de Domicilio</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-gray-700">Descripción</label>
                  <textarea
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Instrucciones adicionales para el cliente..."
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={requestForm.required}
                      onChange={(e) => setRequestForm({ ...requestForm, required: e.target.checked })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Documento requerido</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium"
                  >
                    ✅ Solicitar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(false)}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {file.requestedDocuments.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 mb-2">No hay documentos solicitados</p>
                <p className="text-sm text-gray-400">Usa el botón "+ Solicitar Documento" para agregar uno</p>
              </div>
            ) : (
              <div className="space-y-2">
                {file.requestedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-4 rounded-lg border-2 ${
                      doc.status === 'received'
                        ? 'bg-green-50 border-green-300 shadow-sm'
                        : doc.status === 'pending'
                        ? 'bg-yellow-50 border-yellow-300 shadow-sm'
                        : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg">
                            {doc.status === 'received' ? '✅' : doc.status === 'pending' ? '⏳' : '❌'}
                          </span>
                          <p className="font-semibold text-gray-900">{doc.name}</p>
                          {doc.required && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium">
                              Requerido
                            </span>
                          )}
                        </div>
                        {doc.description && (
                          <p className="text-sm text-gray-600 ml-7">{doc.description}</p>
                        )}
                        {doc.requestedAt && (
                          <p className="text-xs text-gray-500 ml-7 mt-1">
                            Solicitado: {new Date(doc.requestedAt).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 text-xs rounded-full font-medium ${
                          doc.status === 'received'
                            ? 'bg-green-200 text-green-800'
                            : doc.status === 'pending'
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {doc.status === 'received' ? '✅ Recibido' : doc.status === 'pending' ? '⏳ Pendiente' : '❌ Rechazado'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documentos Recibidos */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-green-900">✅ Documentos Recibidos</h3>
            {file.documents.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-2">No hay documentos recibidos aún.</p>
                <p className="text-sm text-gray-400">Los documentos aparecerán aquí cuando el cliente los suba</p>
              </div>
            ) : (
              <div className="space-y-2">
                {file.documents.map((doc) => (
                  <div key={doc.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-green-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-lg">📎</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{doc.name}</p>
                        <p className="text-sm text-gray-600">
                          Subido por: <span className="font-medium">{doc.uploadedBy === 'customer' ? 'Cliente' : 'Vendedor/Dealer'}</span> •{' '}
                          {new Date(doc.uploadedAt).toLocaleDateString('es-ES', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
                    >
                      Ver →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Información Adicional */}
        {file.notes && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-purple-900">📝 Notas del Caso</h3>
            <p className="text-purple-800 whitespace-pre-wrap">{file.notes}</p>
          </div>
        )}

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Creado:</span>{' '}
            {new Date(file.createdAt).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <div>
            <span className="font-medium">Actualizado:</span>{' '}
            {new Date(file.updatedAt).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Estado:</span>{' '}
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              file.status === 'active' ? 'bg-green-100 text-green-800' :
              file.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {file.status === 'active' ? 'Activo' : file.status === 'completed' ? 'Completado' : 'Archivado'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateCustomerFileModal({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: () => void;
  onError?: (error: string, details: string) => void;
}) {
  const [formData, setFormData] = useState({
    customerFullName: '',
    customerPhone: '',
    customerEmail: '',
    customerStreet: '',
    customerCity: '',
    customerState: '',
    customerZipCode: '',
    customerCountry: '',
    customerDriverLicense: '',
    customerVehiclePlate: '',
    vehicleId: '',
    saleId: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    try {
      const response = await fetch('/api/vehicles');
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.customerFullName || !formData.customerPhone || !formData.customerEmail) {
      alert('Por favor completa los campos requeridos del cliente');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/customer-files/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // IMPORTANTE: Incluir cookies de autenticación
        body: JSON.stringify({
          customerInfo: {
            fullName: formData.customerFullName,
            phone: formData.customerPhone,
            email: formData.customerEmail,
            address: {
              street: formData.customerStreet || undefined,
              city: formData.customerCity || undefined,
              state: formData.customerState || undefined,
              zipCode: formData.customerZipCode || undefined,
              country: formData.customerCountry || undefined,
            },
            driverLicenseNumber: formData.customerDriverLicense || undefined,
            vehiclePlate: formData.customerVehiclePlate || undefined,
          },
          vehicleId: formData.vehicleId || undefined,
          saleId: formData.saleId || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Caso creado exitosamente');
        onSuccess();
      } else {
        let errorMsg = 'Error al crear el caso';
        let errorDet = '';
        try {
          const error = await response.json();
          errorMsg = error.error || error.message || errorMsg;
          errorDet = error.details || error.code || '';
          console.error('Error al crear caso:', error);
          
          // Mostrar error usando callback o alert
          const fullError = errorDet ? `${errorMsg}\n\n${errorDet}\nCódigo: ${error.code || 'N/A'}` : `${errorMsg}\nCódigo: ${error.code || 'N/A'}`;
          if (onError) {
            onError(errorMsg, fullError);
          } else {
            alert(fullError);
          }
        } catch (parseError) {
          // Si no se puede parsear el error, mostrar el texto de la respuesta
          const text = await response.text();
          const errorMsg = `Error al crear el caso (${response.status})`;
          const errorDet = text || 'No se pudo obtener más información del error';
          if (onError) {
            onError(errorMsg, errorDet);
          } else {
            alert(`${errorMsg}\n\n${errorDet}`);
          }
        }
      }
    } catch (error: any) {
      console.error('Error:', error);
      const errorMsg = error.message || error.toString() || 'Error desconocido';
      if (onError) {
        onError('Error al crear el caso', errorMsg);
      } else {
        alert(`Error al crear el caso\n\n${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Crear Caso de Cliente Manualmente</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Información del Cliente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customerFullName}
                  onChange={(e) => setFormData({ ...formData, customerFullName: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Licencia de Conducir</label>
                <input
                  type="text"
                  value={formData.customerDriverLicense}
                  onChange={(e) => setFormData({ ...formData, customerDriverLicense: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tablilla del Vehículo</label>
                <input
                  type="text"
                  value={formData.customerVehiclePlate}
                  onChange={(e) => setFormData({ ...formData, customerVehiclePlate: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Dirección</label>
              <div className="grid grid-cols-2 gap-4 mb-2">
                <input
                  type="text"
                  placeholder="Calle"
                  value={formData.customerStreet}
                  onChange={(e) => setFormData({ ...formData, customerStreet: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Ciudad"
                  value={formData.customerCity}
                  onChange={(e) => setFormData({ ...formData, customerCity: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Estado"
                  value={formData.customerState}
                  onChange={(e) => setFormData({ ...formData, customerState: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Código Postal"
                  value={formData.customerZipCode}
                  onChange={(e) => setFormData({ ...formData, customerZipCode: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="País"
                  value={formData.customerCountry}
                  onChange={(e) => setFormData({ ...formData, customerCountry: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Información Adicional (Opcional)</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Vehículo</label>
                <select
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Seleccionar vehículo...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ID de Venta</label>
                <input
                  type="text"
                  value={formData.saleId}
                  onChange={(e) => setFormData({ ...formData, saleId: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Notas</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={3}
                placeholder="Notas adicionales sobre este caso..."
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Caso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

