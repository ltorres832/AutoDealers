'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Template {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp' | 'message';
  category: string;
  subject?: string;
  content: string;
  variables: string[];
  isDefault: boolean;
  isEditable: boolean;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'email' | 'sms' | 'whatsapp' | 'message'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [selectedType]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const url = selectedType !== 'all' 
        ? `/api/settings/templates?type=${selectedType}`
        : '/api/settings/templates';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        const errorData = await response.json();
        console.error('Error fetching templates:', errorData);
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  async function initializeDefaultTemplates() {
    try {
      const response = await fetch('/api/settings/templates/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Leer la respuesta como texto primero para debugging
      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        // Si no es JSON, mostrar el error
        console.error('Response is not valid JSON:', responseText.substring(0, 500));
        console.error('Status:', response.status);
        console.error('Headers:', Object.fromEntries(response.headers.entries()));
        
        // Si es un 404, el endpoint no existe
        if (response.status === 404) {
          alert('Error: El endpoint no existe. Por favor verifica que la aplicación esté corriendo correctamente.');
        } else {
          alert(`Error: El servidor devolvió una respuesta no válida (${response.status}). Por favor verifica los logs de la consola.`);
        }
        return;
      }

      if (response.ok) {
        const count = data.count || 0;
        alert(`Templates inicializados exitosamente. Se crearon ${count} templates.`);
        await fetchTemplates();
      } else {
        const errorMsg = data.error || 'Error al inicializar templates';
        const message = data.message ? `\n${data.message}` : '';
        const details = data.details ? '\nDetalles: ' + JSON.stringify(data.details) : '';
        alert(errorMsg + message + details);
        console.error('Error initializing templates:', data);
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error al inicializar templates: ' + (error.message || 'Error desconocido') + '\nPor favor verifica la consola para más detalles.');
    }
  }

  function handleEdit(template: Template) {
    setSelectedTemplate(template);
    setShowEditModal(true);
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const filteredTemplates = selectedType === 'all' 
    ? templates 
    : templates.filter(t => t.type === selectedType);

  const templatesByCategory = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración</h1>
        <p className="text-gray-600">
          Personaliza tu dashboard y conecta tus redes sociales
        </p>
        
        {/* Settings Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <Link
              href="/settings/branding"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Branding
            </Link>
            <Link
              href="/settings/integrations"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Integraciones
            </Link>
            <Link
              href="/settings/templates"
              className="border-b-2 border-primary-500 py-4 px-1 text-sm font-medium text-primary-600"
            >
              Templates
            </Link>
            <Link
              href="/settings/membership"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Membresía
            </Link>
          </nav>
        </div>
      </div>

      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Templates de Email y Mensajes</h2>
          <p className="text-gray-600">
            Gestiona los templates para emails, SMS, WhatsApp y mensajes del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            + Crear Template Custom
          </button>
          {templates.length === 0 && (
            <button
              onClick={initializeDefaultTemplates}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              Inicializar Templates por Defecto
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {(['all', 'email', 'sms', 'whatsapp', 'message'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedType === type
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type === 'all' ? 'Todos' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Templates List */}
      <div className="space-y-8">
        {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
              {category.replace('_', ' ')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {template.type === 'email' && '📧 Email'}
                        {template.type === 'sms' && '📱 SMS'}
                        {template.type === 'whatsapp' && '💬 WhatsApp'}
                        {template.type === 'message' && '💭 Mensaje'}
                        {template.isDefault && ' • Por defecto'}
                      </p>
                    </div>
                  </div>

                  {template.subject && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700">Asunto:</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">
                        {template.subject}
                      </p>
                    </div>
                  )}

                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Contenido:</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded line-clamp-3">
                      {template.content}
                    </p>
                  </div>

                  {template.variables.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-700 mb-1">Variables disponibles:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((variable) => (
                          <span
                            key={variable}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                          >
                            {`{{${variable}}}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {template.isEditable && (
                    <button
                      onClick={() => handleEdit(template)}
                      className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium text-sm"
                    >
                      Editar Template
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">
              {selectedType === 'all' 
                ? 'No hay templates. Inicializa los templates por defecto para comenzar.'
                : `No hay templates de tipo ${selectedType}.`}
            </p>
            {selectedType === 'all' && templates.length === 0 && (
              <button
                onClick={initializeDefaultTemplates}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                Inicializar Templates por Defecto
              </button>
            )}
          </div>
        )}
      </div>

      {showEditModal && selectedTemplate && (
        <EditTemplateModal
          template={selectedTemplate}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTemplate(null);
          }}
          onSave={fetchTemplates}
        />
      )}

      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onSave={fetchTemplates}
        />
      )}
    </div>
  );
}

function CreateTemplateModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'email' as 'email' | 'sms' | 'whatsapp' | 'message',
    category: '',
    subject: '',
    content: '',
    variables: [] as string[],
  });
  const [variableInput, setVariableInput] = useState('');
  const [loading, setLoading] = useState(false);

  function addVariable() {
    if (variableInput.trim() && !formData.variables.includes(variableInput.trim())) {
      setFormData({
        ...formData,
        variables: [...formData.variables, variableInput.trim()],
      });
      setVariableInput('');
    }
  }

  function removeVariable(variable: string) {
    setFormData({
      ...formData,
      variables: formData.variables.filter(v => v !== variable),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/settings/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          subject: formData.type === 'email' ? formData.subject : undefined,
          isDefault: false,
          isEditable: true,
        }),
      });

      if (response.ok) {
        onSave();
        onClose();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Error al crear template');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear template');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Crear Template Custom</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre del Template</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
              placeholder="Ej: Bienvenida Personalizada"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="email">📧 Email</option>
              <option value="sms">📱 SMS</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="message">💭 Mensaje</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Categoría</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
              placeholder="Ej: bienvenida, seguimiento, promocion"
            />
          </div>

          {formData.type === 'email' && (
            <div>
              <label className="block text-sm font-medium mb-2">Asunto</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
                placeholder="Ej: Bienvenido a AutoDealers"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Contenido</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full border rounded px-3 py-2 h-64"
              required
              placeholder="Escribe el contenido del template. Usa {{variable}} para variables dinámicas."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Variables</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={variableInput}
                onChange={(e) => setVariableInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addVariable();
                  }
                }}
                className="flex-1 border rounded px-3 py-2"
                placeholder="Nombre de variable (sin {{}})"
              />
              <button
                type="button"
                onClick={addVariable}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Agregar
              </button>
            </div>
            {formData.variables.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.variables.map((variable) => (
                  <span
                    key={variable}
                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm"
                  >
                    {`{{${variable}}}`}
                    <button
                      type="button"
                      onClick={() => removeVariable(variable)}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Las variables se usarán como {formData.variables.length > 0 ? formData.variables.map(v => `{{${v}}}`).join(', ') : '{{nombre_variable}}'} en el contenido
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              {loading ? 'Creando...' : 'Crear Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditTemplateModal({
  template,
  onClose,
  onSave,
}: {
  template: Template;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    subject: template.subject || '',
    content: template.content,
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/settings/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSave();
        onClose();
      } else {
        alert('Error al actualizar template');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar template');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Editar Template: {template.name}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {template.type === 'email' && (
            <div>
              <label className="block text-sm font-medium mb-2">Asunto</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Contenido</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full border rounded px-3 py-2 h-64"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Usa variables como {template.variables.map(v => `{{${v}}}`).join(', ')}
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

