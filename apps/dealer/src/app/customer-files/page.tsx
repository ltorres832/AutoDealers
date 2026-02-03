'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  }>;
  uploadToken: string;
  status: 'active' | 'completed' | 'archived' | 'deleted';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
}

export default function CustomerFilesPage() {
  const [files, setFiles] = useState<CustomerFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<CustomerFile | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'archived'>('all');

  useEffect(() => {
    fetchFiles();
  }, [filter]);

  async function fetchFiles() {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }
      const response = await fetch(`/api/customer-files?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
        
        // Obtener información de vehículos
        const vehicleIds = [...new Set(data.files.map((f: CustomerFile) => f.vehicleId))];
        const vehiclePromises = vehicleIds.map(id => 
          fetch(`/api/vehicles?id=${id}`).then(r => r.json())
        );
        const vehicleResults = await Promise.all(vehiclePromises);
        const vehicleMap: Record<string, Vehicle> = {};
        vehicleResults.forEach(result => {
          if (result.vehicle) {
            vehicleMap[result.vehicle.id] = result.vehicle;
          }
        });
        setVehicles(vehicleMap);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Casos de Cliente</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
        >
          + Crear Caso Manualmente
        </button>
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
          onUpdate={fetchFiles}
        />
      )}

      {/* Modal de Crear Caso Manualmente */}
      {showCreateModal && (
        <CreateCustomerFileModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchFiles();
          }}
        />
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
      const response = await fetch(`/api/customer-files/${file.id}/upload-link`);
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
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Caso de Cliente</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Información del Cliente */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Información del Cliente</h3>
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
          <div>
            <h3 className="text-lg font-semibold mb-3">Enlace de Subida</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/upload-documents/${file.uploadToken}`}
                readOnly
                className="flex-1 border border-gray-300 rounded px-3 py-2"
              />
              <button
                onClick={getUploadLink}
                className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
              >
                Copiar
              </button>
            </div>
          </div>

          {/* Documentos Solicitados */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Documentos Solicitados</h3>
              <button
                onClick={() => setShowRequestForm(!showRequestForm)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                + Solicitar Documento
              </button>
            </div>

            {showRequestForm && (
              <form onSubmit={handleRequestDocument} className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre del Documento *</label>
                    <input
                      type="text"
                      value={requestForm.name}
                      onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo</label>
                    <select
                      value={requestForm.type}
                      onChange={(e) => setRequestForm({ ...requestForm, type: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="license">Licencia de Conducir</option>
                      <option value="insurance">Seguro</option>
                      <option value="registration">Registro</option>
                      <option value="identification">Identificación</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <textarea
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={2}
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={requestForm.required}
                      onChange={(e) => setRequestForm({ ...requestForm, required: e.target.checked })}
                    />
                    <span className="text-sm">Documento requerido</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
                  >
                    Solicitar
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

            <div className="space-y-2">
              {file.requestedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className={`p-3 rounded-lg border ${
                    doc.status === 'received'
                      ? 'bg-green-50 border-green-200'
                      : doc.status === 'pending'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      {(doc as any).description && <p className="text-sm text-gray-600">{(doc as any).description}</p>}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        doc.status === 'received'
                          ? 'bg-green-100 text-green-800'
                          : doc.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {doc.status === 'received' ? 'Recibido' : doc.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Documentos Recibidos */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Documentos Recibidos</h3>
            {file.documents.length === 0 ? (
              <p className="text-gray-500">No hay documentos recibidos aún.</p>
            ) : (
              <div className="space-y-2">
                {file.documents.map((doc) => (
                  <div key={doc.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-sm text-gray-600">
                        Subido por: {doc.uploadedBy === 'customer' ? 'Cliente' : 'Vendedor/Dealer'} •{' '}
                        {new Date(doc.uploadedAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      Ver →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
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
}: {
  onClose: () => void;
  onSuccess: () => void;
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
        alert('Caso creado exitosamente');
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al crear el caso');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear el caso');
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

