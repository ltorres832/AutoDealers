'use client';

// Componente avanzado para subir y digitalizar contratos (versión seller)

import { useState, useRef, useCallback } from 'react';

interface ContractUploadManagerProps {
  saleId?: string;
  leadId?: string;
  vehicleId?: string;
  fiRequestId?: string;
  onContractCreated?: (contractId: string) => void;
}

export default function ContractUploadManager({
  saleId,
  leadId,
  vehicleId,
  fiRequestId,
  onContractCreated,
}: ContractUploadManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [digitalizing, setDigitalizing] = useState(false);
  const [contract, setContract] = useState<any>(null);
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
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 10MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      if (saleId) formData.append('saleId', saleId);
      if (leadId) formData.append('leadId', leadId);
      if (vehicleId) formData.append('vehicleId', vehicleId);
      if (fiRequestId) formData.append('fiRequestId', fiRequestId);

      const uploadResponse = await fetch('/api/contracts/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Error al subir contrato');
      }

      const uploadData = await uploadResponse.json();
      setContract(uploadData.contract);

      if (uploadData.contract.id) {
        await startDigitalization(uploadData.contract.id);
      }

      if (onContractCreated) {
        onContractCreated(uploadData.contract.id);
      }
    } catch (error) {
      console.error('Error uploading contract:', error);
      alert('Error al subir contrato');
    } finally {
      setUploading(false);
    }
  };

  const startDigitalization = async (contractId: string) => {
    setDigitalizing(true);

    try {
      const response = await fetch(`/api/contracts/${contractId}/digitalize`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al digitalizar contrato');
      }

      const data = await response.json();
      setContract(data.contract);
    } catch (error) {
      console.error('Error digitalizing contract:', error);
      alert('Error al digitalizar contrato');
    } finally {
      setDigitalizing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div
          ref={dropZoneRef}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`space-y-4 transition-colors ${
            dragActive ? 'opacity-75' : ''
          }`}
        >
          <div className="text-5xl">📄</div>
          <div>
            <p className="text-lg font-semibold text-gray-700">
              Arrastra un contrato PDF aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Solo archivos PDF (máx. 10MB)
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Subiendo...' : 'Seleccionar Contrato'}
          </button>
        </div>
      </div>

      {digitalizing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
            <span className="text-yellow-700">Digitalizando contrato con IA...</span>
          </div>
        </div>
      )}

      {contract && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contrato Cargado</h3>
          
          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-600">Nombre:</span>
              <p className="font-medium">{contract.name}</p>
            </div>
            
            {contract.digitalization && (
              <div>
                <span className="text-sm text-gray-600">Estado de Digitalización:</span>
                <p className={`font-medium capitalize ${
                  contract.digitalization.status === 'completed' ? 'text-green-600' :
                  contract.digitalization.status === 'processing' ? 'text-yellow-600' :
                  contract.digitalization.status === 'failed' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {contract.digitalization.status === 'completed' ? 'Completada' :
                   contract.digitalization.status === 'processing' ? 'Procesando' :
                   contract.digitalization.status === 'failed' ? 'Fallida' :
                   'Pendiente'}
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <a
                href={contract.originalDocumentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Ver Original
              </a>
              
              {contract.digitalizedDocumentUrl && (
                <a
                  href={contract.digitalizedDocumentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                >
                  Ver Digitalizado
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


