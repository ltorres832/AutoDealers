'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface CustomerFile {
  id: string;
  customerInfo: {
    fullName: string;
    phone: string;
    email: string;
  };
  requestedDocuments: Array<{
    id: string;
    name: string;
    description?: string;
    type: string;
    required: boolean;
    status: 'pending' | 'received' | 'rejected';
  }>;
  documents: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedAt: string;
  }>;
}

export default function UploadDocumentsPage() {
  const params = useParams();
  const token = params.token as string;
  const [file, setFile] = useState<CustomerFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  useEffect(() => {
    fetchFile();
  }, [token]);

  async function fetchFile() {
    try {
      const response = await fetch(`/api/upload-documents/${token}`);
      if (response.ok) {
        const data = await response.json();
        setFile(data.file);
      } else {
        alert('Enlace inválido o expirado');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar la información');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDocument || uploadedFiles.length === 0) {
      alert('Por favor selecciona un tipo de documento y sube al menos un archivo');
      return;
    }

    setUploading(true);
    try {
      const requestedDoc = file?.requestedDocuments.find(rd => rd.id === selectedDocument);
      
      for (const fileUpload of uploadedFiles) {
        const formData = new FormData();
        formData.append('file', fileUpload);
        formData.append('type', requestedDoc?.type || 'other');
        formData.append('name', requestedDoc?.name || fileUpload.name);

        const response = await fetch(`/api/upload-documents/${token}`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Error al subir el archivo');
        }
      }

      alert('Documentos subidos exitosamente');
      setUploadedFiles([]);
      setSelectedDocument('');
      fetchFile();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al subir los documentos');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Enlace inválido</h1>
          <p className="text-gray-600">Este enlace no es válido o ha expirado.</p>
        </div>
      </div>
    );
  }

  const pendingDocuments = file.requestedDocuments.filter(rd => rd.status === 'pending');
  const receivedDocuments = file.documents;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Subir Documentos
          </h1>
          <p className="text-gray-600 mb-6">
            Hola <strong>{file.customerInfo.fullName}</strong>, por favor sube los documentos solicitados.
          </p>

          {/* Documentos Pendientes */}
          {pendingDocuments.length > 0 ? (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Documentos Solicitados
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecciona el documento a subir <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedDocument}
                    onChange={(e) => setSelectedDocument(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Selecciona un documento...</option>
                    {pendingDocuments.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} {doc.required && <span className="text-red-500">*</span>}
                        {doc.description && ` - ${doc.description}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Archivo(s) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setUploadedFiles(Array.from(e.target.files || []))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                  {uploadedFiles.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      {uploadedFiles.length} archivo(s) seleccionado(s)
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Subiendo...' : 'Subir Documentos'}
                </button>
              </form>
            </div>
          ) : (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">
                ✅ Todos los documentos solicitados han sido recibidos.
              </p>
            </div>
          )}

          {/* Documentos Recibidos */}
          {receivedDocuments.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Documentos Subidos
              </h2>
              <div className="space-y-2">
                {receivedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{doc.name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(doc.uploadedAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


