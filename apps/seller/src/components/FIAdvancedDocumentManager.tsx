'use client';

// Sistema avanzado de gestión de documentos F&I con validación IA, OCR y categorización automática

import { useState, useRef, useCallback } from 'react';

interface Document {
  id: string;
  type: string;
  name: string;
  url: string;
  uploadedAt: Date;
  status: 'pending' | 'validating' | 'valid' | 'invalid' | 'needs_review';
  validation?: {
    isValid: boolean;
    isLegible: boolean;
    extractedData?: Record<string, any>;
    confidence: number;
    discrepancies?: Array<{ field: string; expected: any; found: any }>;
  };
  category?: string;
  thumbnail?: string;
}

interface DocumentType {
  id: string;
  name: string;
  description: string;
  required: boolean;
  category: 'identification' | 'income' | 'financial' | 'vehicle' | 'other';
  acceptedFormats: string[];
  maxSize: number; // MB
}

const DOCUMENT_TYPES: DocumentType[] = [
  {
    id: 'drivers_license',
    name: 'Licencia de Conducir',
    description: 'Licencia de conducir válida (frente y reverso)',
    required: true,
    category: 'identification',
    acceptedFormats: ['image/jpeg', 'image/png', 'image/pdf'],
    maxSize: 5,
  },
  {
    id: 'proof_of_income',
    name: 'Comprobante de Ingresos',
    description: 'Recibos de pago, estados de cuenta o declaraciones',
    required: true,
    category: 'income',
    acceptedFormats: ['image/jpeg', 'image/png', 'image/pdf'],
    maxSize: 10,
  },
  {
    id: 'bank_statement',
    name: 'Estado de Cuenta Bancario',
    description: 'Últimos 3 meses de estados de cuenta',
    required: true,
    category: 'financial',
    acceptedFormats: ['image/jpeg', 'image/png', 'image/pdf'],
    maxSize: 10,
  },
  {
    id: 'tax_return',
    name: 'Declaración de Impuestos',
    description: 'Última declaración anual de impuestos',
    required: false,
    category: 'income',
    acceptedFormats: ['image/jpeg', 'image/png', 'image/pdf'],
    maxSize: 10,
  },
  {
    id: 'employment_letter',
    name: 'Carta de Empleo',
    description: 'Carta del empleador confirmando empleo e ingresos',
    required: false,
    category: 'income',
    acceptedFormats: ['image/jpeg', 'image/png', 'image/pdf'],
    maxSize: 5,
  },
  {
    id: 'pay_stub',
    name: 'Recibo de Pago',
    description: 'Últimos recibos de pago (mínimo 2 meses)',
    required: false,
    category: 'income',
    acceptedFormats: ['image/jpeg', 'image/png', 'image/pdf'],
    maxSize: 5,
  },
  {
    id: 'proof_of_address',
    name: 'Comprobante de Domicilio',
    description: 'Recibo de servicios públicos o contrato de arrendamiento',
    required: true,
    category: 'identification',
    acceptedFormats: ['image/jpeg', 'image/png', 'image/pdf'],
    maxSize: 5,
  },
  {
    id: 'insurance',
    name: 'Seguro',
    description: 'Póliza de seguro actual del vehículo',
    required: false,
    category: 'vehicle',
    acceptedFormats: ['image/jpeg', 'image/png', 'image/pdf'],
    maxSize: 5,
  },
  {
    id: 'trade_in_title',
    name: 'Título de Vehículo de Intercambio',
    description: 'Título del vehículo que se usará como trade-in',
    required: false,
    category: 'vehicle',
    acceptedFormats: ['image/jpeg', 'image/png', 'image/pdf'],
    maxSize: 5,
  },
];

interface FIAdvancedDocumentManagerProps {
  clientId: string;
  requestId?: string;
  onDocumentsChange?: (documents: Document[]) => void;
  requiredDocuments?: string[];
}

export default function FIAdvancedDocumentManager({
  clientId,
  requestId,
  onDocumentsChange,
  requiredDocuments = [],
}: FIAdvancedDocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [validating, setValidating] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      await uploadAndValidateDocument(file);
    }
  };

  const uploadAndValidateDocument = async (file: File) => {
    // Determinar tipo de documento basado en nombre o categoría
    const docType = detectDocumentType(file);
    
    // Validar formato y tamaño
    const validation = validateFile(file, docType);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    setUploading(tempId);

    try {
      // Subir archivo
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId);
      formData.append('type', docType.id);
      if (requestId) formData.append('requestId', requestId);

      const uploadResponse = await fetch('/api/fi/documents/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Error al subir documento');
      }

      const uploadData = await uploadResponse.json();
      
      // Validar con IA
      setValidating(tempId);
      const validateResponse = await fetch('/api/fi/documents/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId: uploadData.documentId,
          documentUrl: uploadData.url,
          documentType: docType.id,
          clientId,
        }),
      });

      const validationResult = await validateResponse.json();

      const newDocument: Document = {
        id: uploadData.documentId,
        type: docType.id,
        name: file.name,
        url: uploadData.url,
        uploadedAt: new Date(),
        status: validationResult.isValid ? 'valid' : 'needs_review',
        validation: validationResult,
        category: docType.category,
        thumbnail: uploadData.thumbnail,
      };

      setDocuments(prev => {
        const updated = [...prev, newDocument];
        if (onDocumentsChange) {
          onDocumentsChange(updated);
        }
        return updated;
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error al subir documento');
    } finally {
      setUploading(null);
      setValidating(null);
    }
  };

  async function revalidateDocument(doc: Document) {
    setValidating(doc.id);
    try {
      const validateResponse = await fetch('/api/fi/documents/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId: doc.id,
          documentUrl: doc.url,
          documentType: doc.type,
          clientId,
        }),
      });

      if (!validateResponse.ok) {
        throw new Error('Error al re-validar documento');
      }

      const validationResult = await validateResponse.json();
      setDocuments((prev) => {
        const updated = prev.map((item) =>
          item.id === doc.id
            ? {
                ...item,
                status: validationResult.isValid ? ('valid' as const) : ('needs_review' as const),
                validation: validationResult,
              }
            : item
        );
        onDocumentsChange?.(updated);
        return updated;
      });
    } catch (error) {
      console.error('Error re-validating document:', error);
      alert('No se pudo re-validar el documento');
    } finally {
      setValidating(null);
    }
  };

  const detectDocumentType = (file: File): DocumentType => {
    const fileName = file.name.toLowerCase();
    
    // Detección básica por nombre de archivo
    if (fileName.includes('license') || fileName.includes('licencia')) {
      return DOCUMENT_TYPES.find(t => t.id === 'drivers_license') || DOCUMENT_TYPES[0];
    }
    if (fileName.includes('pay') || fileName.includes('pago') || fileName.includes('stub')) {
      return DOCUMENT_TYPES.find(t => t.id === 'pay_stub') || DOCUMENT_TYPES[0];
    }
    if (fileName.includes('bank') || fileName.includes('banco') || fileName.includes('statement')) {
      return DOCUMENT_TYPES.find(t => t.id === 'bank_statement') || DOCUMENT_TYPES[0];
    }
    if (fileName.includes('tax') || fileName.includes('impuesto')) {
      return DOCUMENT_TYPES.find(t => t.id === 'tax_return') || DOCUMENT_TYPES[0];
    }
    
    // Por defecto, usar el primer tipo requerido que falte
    const missingRequired = DOCUMENT_TYPES.find(
      t => t.required && !documents.some(d => d.type === t.id)
    );
    
    return missingRequired || DOCUMENT_TYPES[0];
  };

  const validateFile = (file: File, docType: DocumentType): { valid: boolean; error?: string } => {
    // Validar formato
    if (!docType.acceptedFormats.includes(file.type)) {
      return {
        valid: false,
        error: `Formato no aceptado. Formatos permitidos: ${docType.acceptedFormats.join(', ')}`,
      };
    }

    // Validar tamaño
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > docType.maxSize) {
      return {
        valid: false,
        error: `Archivo demasiado grande. Tamaño máximo: ${docType.maxSize}MB`,
      };
    }

    return { valid: true };
  };

  const removeDocument = async (documentId: string) => {
    try {
      await fetch(`/api/fi/documents/${documentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      setDocuments(prev => {
        const updated = prev.filter(d => d.id !== documentId);
        if (onDocumentsChange) {
          onDocumentsChange(updated);
        }
        return updated;
      });
    } catch (error) {
      console.error('Error removing document:', error);
    }
  };

  const getStatusBadge = (status: Document['status']) => {
    const statusMap = {
      pending: { color: 'bg-gray-500', label: 'Pendiente' },
      validating: { color: 'bg-yellow-500', label: 'Validando...' },
      valid: { color: 'bg-green-500', label: 'Válido' },
      invalid: { color: 'bg-red-500', label: 'Inválido' },
      needs_review: { color: 'bg-orange-500', label: 'Revisar' },
    };

    const statusInfo = statusMap[status] || statusMap.pending;
    return (
      <span className={`px-2 py-1 rounded text-xs text-white ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getRequiredDocumentsStatus = () => {
    const required = DOCUMENT_TYPES.filter(t => t.required || requiredDocuments.includes(t.id));
    const uploaded = documents.map(d => d.type);
    
    return required.map(type => ({
      type,
      uploaded: uploaded.includes(type.id),
      valid: documents.find(d => d.type === type.id)?.status === 'valid',
    }));
  };

  return (
    <div className="space-y-6">
      {/* Estado de Documentos Requeridos */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <h3 className="font-semibold text-primary-900 mb-3">Documentos Requeridos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {getRequiredDocumentsStatus().map(({ type, uploaded, valid }) => (
            <div
              key={type.id}
              className={`flex items-center justify-between p-2 rounded ${
                valid ? 'bg-green-100' : uploaded ? 'bg-yellow-100' : 'bg-white'
              }`}
            >
              <span className="text-sm">{type.name}</span>
              {valid ? (
                <span className="text-green-600">✓</span>
              ) : uploaded ? (
                <span className="text-yellow-600">⚠</span>
              ) : (
                <span className="text-red-600">✗</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Zona de Carga */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="text-4xl">📄</div>
          <div>
            <p className="text-lg font-semibold text-gray-700">
              Arrastra documentos aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Formatos aceptados: JPEG, PNG, PDF (máx. 10MB por archivo)
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Seleccionar Archivos
          </button>
        </div>
      </div>

      {/* Lista de Documentos */}
      {documents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Documentos Subidos</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                    <p className="text-sm text-gray-600">
                      {DOCUMENT_TYPES.find(t => t.id === doc.type)?.name || doc.type}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(doc.status)}
                    <button
                      onClick={() => removeDocument(doc.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {doc.thumbnail && (
                  <div className="mb-3">
                    <img
                      src={doc.thumbnail}
                      alt={doc.name}
                      className="w-full h-32 object-cover rounded"
                    />
                  </div>
                )}

                {doc.validation && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Legible:</span>
                        <span className={doc.validation.isLegible ? 'text-green-600' : 'text-red-600'}>
                          {doc.validation.isLegible ? 'Sí' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Confianza:</span>
                        <span className="text-gray-900">
                          {(doc.validation.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      {doc.validation.extractedData && Object.keys(doc.validation.extractedData).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-gray-600 font-semibold mb-1">Datos Extraídos:</p>
                          {Object.entries(doc.validation.extractedData).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-xs">
                              <span className="text-gray-600 capitalize">{key}:</span>
                              <span className="text-gray-900">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {doc.validation.discrepancies && doc.validation.discrepancies.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-red-200 bg-red-50 rounded p-2">
                          <p className="text-red-700 font-semibold mb-1 text-xs">Discrepancias:</p>
                          {doc.validation.discrepancies.map((disc, idx) => (
                            <div key={idx} className="text-xs text-red-600">
                              {disc.field}: Esperado "{disc.expected}", encontrado "{disc.found}"
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex space-x-2">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200"
                  >
                    Ver
                  </a>
                  <button
                    onClick={() => revalidateDocument(doc)}
                    disabled={validating === doc.id}
                    className="flex-1 px-3 py-2 bg-primary-100 text-primary-700 rounded text-sm hover:bg-primary-200 disabled:opacity-50"
                  >
                    {validating === doc.id ? 'Validando…' : 'Re-validar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indicadores de Carga */}
      {uploading && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            <span className="text-primary-700">Subiendo documento...</span>
          </div>
        </div>
      )}

      {validating && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
            <span className="text-yellow-700">Validando documento con IA...</span>
          </div>
        </div>
      )}
    </div>
  );
}


