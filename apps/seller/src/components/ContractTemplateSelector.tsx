'use client';

// Componente para seleccionar y llenar plantillas de contratos

import { useState, useEffect } from 'react';

interface ContractTemplate {
  id: string;
  name: string;
  description?: string;
  type: string;
  fillableFields: Array<{
    id: string;
    name: string;
    type: string;
    required: boolean;
    placeholder?: string;
  }>;
}

interface ContractTemplateSelectorProps {
  onTemplateSelected: (templateId: string, fieldValues: Record<string, any>) => Promise<void>;
  saleId?: string;
  leadId?: string;
  vehicleId?: string;
  buyerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export default function ContractTemplateSelector({
  onTemplateSelected,
  saleId,
  leadId,
  vehicleId,
  buyerInfo,
}: ContractTemplateSelectorProps) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Pre-llenar campos con información del comprador si está disponible
  useEffect(() => {
    if (selectedTemplate && buyerInfo) {
      const prefill: Record<string, any> = {};
      selectedTemplate.fillableFields.forEach(field => {
        const fieldName = field.name.toLowerCase();
        if (fieldName.includes('nombre') || fieldName.includes('name')) {
          prefill[field.id] = buyerInfo.name || '';
        } else if (fieldName.includes('email') || fieldName.includes('correo')) {
          prefill[field.id] = buyerInfo.email || '';
        } else if (fieldName.includes('teléfono') || fieldName.includes('phone')) {
          prefill[field.id] = buyerInfo.phone || '';
        } else if (fieldName.includes('dirección') || fieldName.includes('address')) {
          prefill[field.id] = buyerInfo.address || '';
        }
      });
      setFieldValues(prefill);
    }
  }, [selectedTemplate, buyerInfo]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/contracts/templates', {
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

  const handleTemplateSelect = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    // Inicializar valores de campos
    const initialValues: Record<string, any> = {};
    template.fillableFields.forEach(field => {
      initialValues[field.id] = (field as any).defaultValue || '';
    });
    setFieldValues(initialValues);
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    // Validar campos requeridos
    const missingFields = selectedTemplate.fillableFields.filter(
      field => field.required && !fieldValues[field.id]
    );

    if (missingFields.length > 0) {
      alert(`Por favor, completa los siguientes campos requeridos: ${missingFields.map(f => f.name).join(', ')}`);
      return;
    }

    setGenerating(true);
    try {
      await onTemplateSelected(selectedTemplate.id, fieldValues);
      // Reset después de generar
      setSelectedTemplate(null);
      setFieldValues({});
    } catch (error) {
      console.error('Error generating contract:', error);
      alert('Error al generar contrato');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!selectedTemplate) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Seleccionar Plantilla de Contrato</h3>
        
        {templates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-gray-500 mb-4">No hay plantillas disponibles</p>
            <p className="text-sm text-gray-400">Contacta al administrador para crear plantillas de contratos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className="border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
                {template.description && (
                  <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded capitalize">
                    {template.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {template.fillableFields.length} campos
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Llenar Plantilla: {selectedTemplate.name}</h3>
          {selectedTemplate.description && (
            <p className="text-sm text-gray-600 mt-1">{selectedTemplate.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedTemplate(null);
            setFieldValues({});
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          ← Volver
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          <strong>💡 Tip:</strong> Los campos marcados con * son obligatorios. 
          Algunos campos pueden estar pre-llenados con la información del comprador.
        </p>
      </div>

      <div className="space-y-4">
        {selectedTemplate.fillableFields.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            {field.type === 'text' || field.type === 'email' || field.type === 'phone' ? (
              <input
                type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                value={fieldValues[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder || field.name}
                required={field.required}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : field.type === 'number' ? (
              <input
                type="number"
                value={fieldValues[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder || field.name}
                required={field.required}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : field.type === 'date' ? (
              <input
                type="date"
                value={fieldValues[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                required={field.required}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : field.type === 'address' ? (
              <textarea
                value={fieldValues[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder || field.name}
                required={field.required}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <input
                type="text"
                value={fieldValues[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder || field.name}
                required={field.required}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end space-x-4 pt-4 border-t">
        <button
          type="button"
          onClick={() => {
            setSelectedTemplate(null);
            setFieldValues({});
          }}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? 'Generando...' : '✓ Generar Contrato'}
        </button>
      </div>
    </div>
  );
}

