'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SocialIcon from '@/components/SocialIcon';
import { SkeletonGrid } from '@/components/SkeletonLoader';

interface Template {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp';
  event: string;
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  isDefault: boolean;
}

export default function CommunicationTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchTemplates();
  }, [filter]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('type', filter);
      }
      
      // AuthProvider inyectará automáticamente el token
      const response = await fetch(`/api/admin/communication-templates?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  function getTypeIcon(type: string) {
    if (type === 'whatsapp') {
      return <SocialIcon platform="whatsapp" size={24} />;
    }
    const icons: Record<string, string> = {
      email: '📧',
      sms: '💬',
    };
    return icons[type] || '📄';
  }

  function getEventLabel(event: string) {
    const labels: Record<string, string> = {
      subscription_created: 'Suscripción Creada',
      payment_success: 'Pago Exitoso',
      payment_failed: 'Pago Fallido',
      payment_reminder_3days: 'Recordatorio 3 Días',
      payment_reminder_5days: 'Recordatorio 5 Días',
      account_suspended: 'Cuenta Suspendida',
      account_reactivated: 'Cuenta Reactivada',
      subscription_cancelled: 'Suscripción Cancelada',
      trial_ending: 'Prueba Terminando',
      invoice_generated: 'Factura Generada',
      custom: 'Personalizado',
    };
    return labels[event] || event;
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse" />
        </div>
        <SkeletonGrid items={6} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Templates de Comunicación</h1>
            <p className="text-gray-600">
              Gestiona templates para emails, SMS y WhatsApp que se envían automáticamente
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (confirm('¿Crear todos los templates por defecto del sistema? Se crearán 23 templates completos.')) {
                  try {
                    // AuthProvider inyectará automáticamente el token
                    const response = await fetch('/api/admin/communication-templates/force-init', {
                      method: 'POST',
                    });
                    
                    // Leer el body una sola vez
                    const text = await response.text();
                    console.log('=== RESPUESTA DEL SERVIDOR ===');
                    console.log('Status:', response.status);
                    console.log('Status Text:', response.statusText);
                    console.log('Headers:', Object.fromEntries(response.headers.entries()));
                    console.log('Content-Type:', response.headers.get('content-type'));
                    console.log('Body length:', text.length);
                    console.log('Body (first 1000 chars):', text.substring(0, 1000));
                    console.log('=== FIN RESPUESTA ===');
                    
                    let responseData;
                    
                    try {
                      responseData = JSON.parse(text);
                    } catch (jsonError) {
                      console.error('Error parsing JSON response:', jsonError);
                      console.error('Response text (first 500 chars):', text.substring(0, 500));
                      alert('Error: La respuesta del servidor no es válida JSON. Revisa la consola para más detalles.');
                      return;
                    }
                    
                    if (response.ok) {
                      alert(responseData.message || `Templates creados exitosamente. ${responseData.created || 0} creados, ${responseData.errors || 0} errores. Total: ${responseData.total || 0}`);
                      fetchTemplates();
                    } else {
                      const errorMsg = 'Error: ' + (responseData.error || 'Error al crear templates');
                      alert(errorMsg);
                      if (responseData.errorsList && responseData.errorsList.length > 0) {
                        console.error('Errores detallados:', responseData.errorsList);
                      }
                      if (responseData.details) {
                        console.error('Detalles del error:', responseData.details);
                      }
                    }
                  } catch (error) {
                    console.error('Error:', error);
                    alert('Error al crear templates: ' + (error instanceof Error ? error.message : 'Error desconocido'));
                  }
                }
              }}
              className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              🚀 Crear Todos los Templates
            </button>
            <button
              onClick={async () => {
                if (confirm('¿Inicializar templates por defecto del sistema?')) {
                  try {
                    // AuthProvider inyectará automáticamente el token
                    const response = await fetch('/api/admin/communication-templates/initialize', {
                      method: 'POST',
                    });
                    if (response.ok) {
                      const data = await response.json();
                      alert(data.message || 'Templates por defecto inicializados exitosamente');
                      fetchTemplates();
                    } else {
                      const error = await response.json();
                      alert('Error: ' + (error.error || 'Error al inicializar templates'));
                    }
                  } catch (error) {
                    console.error('Error:', error);
                    alert('Error al inicializar templates');
                  }
                }
              }}
              className="bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 font-medium"
            >
              Inicializar Templates
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
            >
              + Crear Template
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('email')}
            className={`px-4 py-2 rounded ${
              filter === 'email'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📧 Email
          </button>
          <button
            onClick={() => setFilter('sms')}
            className={`px-4 py-2 rounded ${
              filter === 'sms'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💬 SMS
          </button>
          <button
            onClick={() => setFilter('whatsapp')}
            className={`px-4 py-2 rounded ${
              filter === 'whatsapp'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💚 WhatsApp
          </button>
        </div>
      </div>

      {/* Lista de templates */}
      {templates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg mb-2">No hay templates creados</p>
          <p className="text-gray-400 text-sm">
            Crea tu primer template para comenzar a enviar comunicaciones automáticas
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{getTypeIcon(template.type)}</span>
                    <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500">{getEventLabel(template.event)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  {template.isDefault && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      Por Defecto
                    </span>
                  )}
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      template.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {template.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              {template.subject && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Asunto:</p>
                  <p className="text-sm text-gray-700 font-medium">{template.subject}</p>
                </div>
              )}

              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Contenido:</p>
                <p className="text-sm text-gray-600 line-clamp-3">{template.content}</p>
              </div>

              {template.variables.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Variables:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((variable) => (
                      <span
                        key={variable}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-mono"
                      >
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingTemplate(template);
                  }}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={async () => {
                    if (confirm('¿Desactivar este template?')) {
                      try {
                        // AuthProvider inyectará automáticamente el token
                        const response = await fetch(`/api/admin/communication-templates/${template.id}`, {
                          method: 'DELETE',
                        });
                        if (response.ok) {
                          fetchTemplates();
                        }
                      } catch (error) {
                        console.error('Error:', error);
                      }
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                >
                  {template.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchTemplates}
        />
      )}

      {editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSuccess={fetchTemplates}
        />
      )}
    </div>
  );
}

function CreateTemplateModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'email' as 'email' | 'sms' | 'whatsapp',
    event: 'custom' as string,
    subject: '',
    content: '',
    variables: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Extraer variables del contenido
      const variableMatches = formData.content.match(/{{(\w+)}}/g) || [];
      const variables = Array.from(
        new Set(
          variableMatches.map((match) => match.replace(/[{}]/g, ''))
        )
      );

      const payload = {
        name: formData.name,
        type: formData.type,
        event: formData.event,
        subject: formData.type === 'email' ? formData.subject : undefined,
        content: formData.content,
        variables,
        isActive: formData.isActive,
        isDefault: false,
      };

      // AuthProvider inyectará automáticamente el token
      const response = await fetch('/api/admin/communication-templates', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onClose();
        onSuccess();
        alert('Template creado exitosamente');
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Error al crear template'));
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
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Crear Template de Comunicación</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="email">📧 Email</option>
                <option value="sms">💬 SMS</option>
                <option value="whatsapp">💚 WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Evento</label>
              <select
                value={formData.event}
                onChange={(e) => setFormData({ ...formData, event: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="custom">Personalizado</option>
                <option value="subscription_created">Suscripción Creada</option>
                <option value="payment_success">Pago Exitoso</option>
                <option value="payment_failed">Pago Fallido</option>
                <option value="payment_reminder_3days">Recordatorio 3 Días</option>
                <option value="payment_reminder_5days">Recordatorio 5 Días</option>
                <option value="account_suspended">Cuenta Suspendida</option>
                <option value="account_reactivated">Cuenta Reactivada</option>
                <option value="subscription_cancelled">Suscripción Cancelada</option>
                <option value="trial_ending">Prueba Terminando</option>
                <option value="invoice_generated">Factura Generada</option>
              </select>
            </div>
          </div>

          {formData.type === 'email' && (
            <div>
              <label className="block text-sm font-medium mb-2">Asunto</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: Pago procesado exitosamente - {{membershipName}}"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Contenido</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={8}
              placeholder="Usa {{variableName}} para variables. Ej: Hola {{userName}}, tu pago de ${{amount}}..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Variables disponibles: userName, userEmail, tenantName, membershipName, amount, currency, periodStart, periodEnd, daysPastDue
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
  onSuccess,
}: {
  template: Template;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: template.name,
    type: template.type,
    event: template.event,
    subject: template.subject || '',
    content: template.content,
    isActive: template.isActive,
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Extraer variables del contenido
      const variableMatches = formData.content.match(/\{\{(\w+)\}\}/g) || [];
      const variables = [...new Set(variableMatches.map(v => v.replace(/\{\{|\}\}/g, '')))];

      // Preparar payload sin campos undefined
      const payload: any = {
        name: formData.name,
        type: formData.type,
        event: formData.event,
        content: formData.content,
        variables,
        isActive: formData.isActive,
      };

      // Solo agregar subject si es email
      if (formData.type === 'email' && formData.subject) {
        payload.subject = formData.subject;
      }

      // AuthProvider inyectará automáticamente el token
      const response = await fetch(`/api/admin/communication-templates/${template.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onClose();
        onSuccess();
        alert('Template actualizado exitosamente');
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Error al actualizar template'));
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
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Editar Template de Comunicación</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
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
              <option value="sms">💬 SMS</option>
              <option value="whatsapp">💚 WhatsApp</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Evento</label>
            <select
              value={formData.event}
              onChange={(e) => setFormData({ ...formData, event: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="subscription_created">Suscripción Creada</option>
              <option value="payment_success">Pago Exitoso</option>
              <option value="payment_failed">Pago Fallido</option>
              <option value="payment_reminder_3days">Recordatorio 3 Días</option>
              <option value="payment_reminder_5days">Recordatorio 5 Días</option>
              <option value="account_suspended">Cuenta Suspendida</option>
              <option value="account_reactivated">Cuenta Reactivada</option>
              <option value="subscription_cancelled">Suscripción Cancelada</option>
              <option value="trial_ending">Prueba Terminando</option>
              <option value="invoice_generated">Factura Generada</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {formData.type === 'email' && (
            <div>
              <label className="block text-sm font-medium mb-2">Asunto (Subject)</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Asunto del email..."
                required={formData.type === 'email'}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Contenido</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={8}
              placeholder="Usa {{variableName}} para variables. Ej: Hola {{userName}}, tu pago de ${{amount}}..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Variables disponibles: userName, userEmail, tenantName, membershipName, amount, currency, periodStart, periodEnd, daysPastDue
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium">Template activo</span>
            </label>
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
              {loading ? 'Actualizando...' : 'Actualizar Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

