'use client';

// Gestor completo de archivos del cliente - Versión Dealer

import { useState, useEffect } from 'react';

interface CustomerFileManagerProps {
  customerId: string;
  saleId?: string;
  vehicleId?: string;
  onDocumentUploaded?: () => void;
}

export default function CustomerFileManager({
  customerId,
  saleId,
  vehicleId,
  onDocumentUploaded,
}: CustomerFileManagerProps) {
  const [customerFile, setCustomerFile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newDocument, setNewDocument] = useState({
    name: '',
    type: 'final_contract' as 'final_contract' | 'title' | 'registration' | 'insurance' | 'warranty' | 'service_record' | 'other',
    file: null as File | null,
  });

  useEffect(() => {
    fetchCustomerFile();
  }, [customerId, saleId]);

  const fetchCustomerFile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/customer-files?customerId=${customerId}${saleId ? `&saleId=${saleId}` : ''}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCustomerFile(data.customerFile);
      } else if (response.status === 404) {
        // Crear nuevo customer file si no existe
        await createCustomerFile();
      }
    } catch (error) {
      console.error('Error fetching customer file:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCustomerFile = async () => {
    try {
      const response = await fetch('/api/customer-files/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId,
          saleId,
          vehicleId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCustomerFile(data.customerFile);
      }
    } catch (error) {
      console.error('Error creating customer file:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewDocument(prev => ({ ...prev, file: e.target.files![0] }));
    }
  };

  const handleUpload = async () => {
    if (!newDocument.name || !newDocument.file || !customerFile) {
      alert('Por favor, completa el nombre y selecciona un archivo');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', newDocument.file);
      formData.append('name', newDocument.name);
      formData.append('type', newDocument.type);
      formData.append('customerFileId', customerFile.id);

      const response = await fetch('/api/customer-files/documents/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        alert('Documento subido exitosamente');
        setShowUploadModal(false);
        setNewDocument({ name: '', type: 'final_contract', file: null });
        await fetchCustomerFile();
        if (onDocumentUploaded) {
          onDocumentUploaded();
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Error al subir documento');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error al subir documento');
    } finally {
      setUploading(false);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      final_contract: 'Contrato Final',
      title: 'Título del Vehículo',
      registration: 'Registro',
      insurance: 'Seguro',
      warranty: 'Garantía',
      service_record: 'Registro de Servicio',
      other: 'Otro',
    };
    return labels[type] || type;
  };

  const getDocumentTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      final_contract: '',
      title: '',
      registration: '',
      insurance: '',
      warranty: '',
      service_record: '',
      other: '',
    };
    return icons[type] || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!customerFile) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Error al cargar archivo del cliente</p>
      </div>
    );
  }

  const allDocuments = [
    ...(customerFile.documents || []),
    ...(customerFile.requestedDocuments || []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">📁 Archivo del Cliente</h3>
          <p className="text-sm text-gray-600 mt-1">
            Todos los documentos relacionados con este cliente en un solo lugar
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          + Subir Documento Final
        </button>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-blue-600 font-medium">Cliente</p>
            <p className="text-blue-900 font-semibold">{customerFile.customerInfo?.fullName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600 font-medium">Teléfono</p>
            <p className="text-blue-900 font-semibold">{customerFile.customerInfo?.phone || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600 font-medium">Email</p>
            <p className="text-blue-900 font-semibold">{customerFile.customerInfo?.email || 'N/A'}</p>
          </div>
        </div>
      </div>

      {allDocuments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-4xl mb-4"></div>
          <p className="text-gray-500 mb-4">No hay documentos aún</p>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Subir Primer Documento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {allDocuments.map((doc: any, index: number) => (
            <div
              key={doc.id || index}
              className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="text-3xl">
                    {getDocumentTypeIcon(doc.type || 'other')}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {doc.name || 'Documento sin nombre'}
                    </h4>
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {getDocumentTypeLabel(doc.type || 'other')}
                      </span>
                      {doc.uploadedAt && (
                        <span>
                          Subido: {new Date(doc.uploadedAt).toLocaleDateString('es-ES')}
                        </span>
                      )}
                      {doc.uploadedBy && (
                        <span className="capitalize">
                          Por: {doc.uploadedBy}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                    >
                      Ver
                    </a>
                  )}
                  {doc.downloadUrl && (
                    <a
                      href={doc.downloadUrl}
                      download
                      className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                    >
                      Descargar
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Subir Documento Final</h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setNewDocument({ name: '', type: 'final_contract', file: null });
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Documento *
                  </label>
                  <input
                    type="text"
                    value={newDocument.name}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Contrato de Venta Final, Título del Vehículo, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Documento *
                  </label>
                  <select
                    value={newDocument.type}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="final_contract">Contrato Final</option>
                    <option value="title">Título del Vehículo</option>
                    <option value="registration">Registro</option>
                    <option value="insurance">Seguro</option>
                    <option value="warranty">Garantía</option>
                    <option value="service_record">Registro de Servicio</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Archivo *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer"
                    >
                      <div className="text-4xl mb-2"></div>
                      <p className="text-gray-600 mb-2">
                        {newDocument.file ? newDocument.file.name : 'Haz clic para seleccionar archivo'}
                      </p>
                      <p className="text-sm text-gray-500">
                        PDF, imágenes, Word (máx. 10MB)
                      </p>
                    </label>
                  </div>
                  {newDocument.file && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                      ✓ Archivo seleccionado: {newDocument.file.name} ({(newDocument.file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    <strong>💡 Importante:</strong> Este documento será visible para el vendedor, dealer y F&I 
                    en el archivo del cliente. Todos los documentos relacionados con este cliente estarán 
                    sincronizados en tiempo real.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setNewDocument({ name: '', type: 'final_contract', file: null });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !newDocument.name || !newDocument.file}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Subiendo...' : '✓ Subir Documento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

