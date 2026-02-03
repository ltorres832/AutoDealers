'use client';

// Página pública para que el cliente suba documentos solicitados
// Accesible mediante link único con token

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface DocumentRequest {
  id: string;
  requestId: string;
  clientId: string;
  requestedDocuments: Array<{
    type: string;
    name: string;
    description?: string;
    required: boolean;
  }>;
  status: string;
  submittedDocuments: Array<{
    id: string;
    type: string;
    name: string;
    url: string;
    uploadedAt: Date;
  }>;
  expiresAt: Date;
}

export default function DocumentUploadPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [docRequest, setDocRequest] = useState<DocumentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      fetchDocumentRequest();
    }
  }, [token]);

  const fetchDocumentRequest = async () => {
    try {
      const response = await fetch(`/api/fi/documents/${token}`);
      if (response.ok) {
        const data = await response.json();
        setDocRequest(data.documentRequest);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Solicitud de documentos no encontrada');
      }
    } catch (err) {
      setError('Error al cargar la solicitud de documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (docType: string, file: File | null) => {
    if (file) {
      setUploadedFiles((prev) => ({ ...prev, [docType]: file }));
    } else {
      setUploadedFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[docType];
        return newFiles;
      });
    }
  };

  const handleUpload = async () => {
    if (!docRequest) return;

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = Object.entries(uploadedFiles).map(async ([docType, file]) => {
        // Subir archivo a storage
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'fi_document');
        formData.append('documentType', docType);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Error al subir ${file.name}`);
        }

        const uploadData = await uploadResponse.json();
        
        // Enviar documento a la solicitud
        const submitResponse = await fetch(`/api/fi/documents/${token}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: docType,
            name: file.name,
            url: uploadData.url,
          }),
        });

        if (!submitResponse.ok) {
          throw new Error(`Error al enviar ${file.name}`);
        }

        return submitResponse.json();
      });

      await Promise.all(uploadPromises);
      setSuccess(true);
      setUploadedFiles({});
      await fetchDocumentRequest(); // Refrescar datos
    } catch (err: any) {
      setError(err.message || 'Error al subir documentos');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando solicitud de documentos...</p>
        </div>
      </div>
    );
  }

  if (error && !docRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!docRequest) {
    return null;
  }

  const isExpired = new Date(docRequest.expiresAt) < new Date();
  const isSubmitted = docRequest.status === 'submitted';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Solicitud de Documentos
          </h1>
          <p className="text-gray-600 mb-6">
            Por favor, sube los siguientes documentos solicitados:
          </p>

          {isExpired && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">
                ⚠️ Esta solicitud de documentos ha expirado. Por favor, contacta con tu vendedor.
              </p>
            </div>
          )}

          {isSubmitted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800">
                ✅ Documentos enviados correctamente. Gracias por tu colaboración.
              </p>
            </div>
          )}

          {success && !isSubmitted && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800">
                ✅ Documentos subidos correctamente. Puedes subir más documentos si es necesario.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {docRequest.requestedDocuments.map((doc) => {
              const submittedDoc = docRequest.submittedDocuments.find(
                (sd) => sd.type === doc.type
              );
              const hasFile = uploadedFiles[doc.type] !== undefined;

              return (
                <div
                  key={doc.type}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {doc.name}
                        {doc.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </h3>
                      {doc.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {doc.description}
                        </p>
                      )}
                    </div>
                    {submittedDoc && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                        ✅ Enviado
                      </span>
                    )}
                  </div>

                  {submittedDoc ? (
                    <div className="mt-3 flex items-center gap-3">
                      <a
                        href={submittedDoc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Ver documento enviado →
                      </a>
                      <button
                        onClick={() => window.open(submittedDoc.url, '_blank')}
                        className="text-gray-600 hover:text-gray-700 text-sm"
                        title="Descargar"
                      >
                        ⬇️ Descargar
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="text-gray-600 hover:text-gray-700 text-sm"
                        title="Imprimir"
                      >
                        🖨️ Imprimir
                      </button>
                      <button
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: doc.name,
                              text: `Documento: ${doc.name}`,
                              url: submittedDoc.url,
                            });
                          } else {
                            navigator.clipboard.writeText(submittedDoc.url);
                            alert('Link copiado al portapapeles');
                          }
                        }}
                        className="text-gray-600 hover:text-gray-700 text-sm"
                        title="Compartir"
                      >
                        🔗 Compartir
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) =>
                          handleFileChange(doc.type, e.target.files?.[0] || null)
                        }
                        disabled={isExpired || isSubmitted}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                      />
                      {hasFile && (
                        <p className="text-sm text-green-600 mt-2">
                          ✓ Archivo seleccionado: {uploadedFiles[doc.type].name}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!isExpired && !isSubmitted && Object.keys(uploadedFiles).length > 0 && (
            <div className="mt-8">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
              >
                {uploading ? 'Subiendo...' : 'Enviar Documentos'}
              </button>
            </div>
          )}

          <div className="mt-6 text-sm text-gray-500">
            <p>
              Esta solicitud expira el:{' '}
              {new Date(docRequest.expiresAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

