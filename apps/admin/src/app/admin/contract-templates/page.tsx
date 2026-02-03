'use client';

// Página de gestión de plantillas de contratos para Admin

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ContractTemplate {
  id: string;
  name: string;
  description?: string;
  type: string;
  category: string;
  templateDocumentUrl: string;
  fillableFields: Array<{
    id: string;
    name: string;
    type: string;
    required: boolean;
  }>;
  isActive: boolean;
}

export default function ContractTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/contract-templates', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Plantillas de Contratos</h1>
            <p className="mt-2 text-gray-600">
              Gestiona las plantillas de contratos que los vendedores pueden usar
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/contract-templates/create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Crear Plantilla
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No hay plantillas aún</p>
          <button
            onClick={() => router.push('/admin/contract-templates/create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Crear Primera Plantilla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                  )}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded capitalize">
                      {template.type}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {template.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">
                  {template.fillableFields.length} campos llenables
                </p>
                <p className="text-xs text-gray-500">
                  {template.fillableFields.filter(f => f.required).length} requeridos
                </p>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => router.push(`/admin/contract-templates/${template.id}/edit`)}
                  className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                >
                  Editar
                </button>
                <a
                  href={template.templateDocumentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                >
                  Ver PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


