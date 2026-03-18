'use client';

import { useState } from 'react';
import { TaskType, TaskPriority, TaskRecurrence } from '@autodealers/crm';
import { useAuth } from '@/hooks/useAuth';

interface CreateTaskModalProps {
  leadId?: string;
  assignedTo?: string;
  tenantId?: string;
  onClose: () => void;
}

export default function CreateTaskModal({ leadId, assignedTo, tenantId, onClose }: CreateTaskModalProps) {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(false);
  const effectiveTenantId = tenantId || auth?.tenantId;
  const [formData, setFormData] = useState({
    type: 'follow_up' as TaskType,
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    dueDate: '',
    dueTime: '',
    reminderDate: '',
    reminderTime: '',
    recurrence: 'none' as TaskRecurrence,
    assignedTo: assignedTo || auth?.userId || '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveTenantId) return;

    setLoading(true);

    try {
      // Combinar fecha y hora
      const dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime}`);
      const reminderDateTime = formData.reminderDate && formData.reminderTime
        ? new Date(`${formData.reminderDate}T${formData.reminderTime}`)
        : undefined;

      const apiPath = tenantId && auth?.role === 'admin'
        ? '/api/admin/tasks'
        : '/api/tasks';

      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId: effectiveTenantId,
          leadId: leadId || undefined,
          assignedTo: formData.assignedTo,
          createdBy: auth?.userId,
          type: formData.type,
          title: formData.title,
          description: formData.description || undefined,
          priority: formData.priority,
          dueDate: dueDateTime.toISOString(),
          reminderDate: reminderDateTime?.toISOString(),
          recurrence: formData.recurrence,
          status: 'pending',
        }),
      });

      if (response.ok) {
        onClose();
      } else {
        const contentType = response.headers.get('content-type');
        let error: any = { message: 'Error al crear la tarea' };
        if (contentType && contentType.includes('application/json')) {
          try {
            error = await response.json();
          } catch (e) {
            const text = await response.text();
            error.message = `Error ${response.status}: ${text.substring(0, 100)}`;
          }
        } else {
          const text = await response.text();
          error.message = `Error ${response.status}: ${text.substring(0, 100)}`;
        }
        alert(error.message || 'Error al crear la tarea');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear la tarea');
    } finally {
      setLoading(false);
    }
  }

  // Obtener fecha mínima (hoy)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Crear Nueva Tarea</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Tarea */}
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Tarea *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as TaskType })}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="call">📞 Llamada</option>
              <option value="email">📧 Email</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="meeting">📅 Reunión</option>
              <option value="follow_up">🔄 Seguimiento</option>
              <option value="document">📄 Documento</option>
              <option value="custom">📝 Personalizada</option>
            </select>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium mb-1">Título *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="Ej: Llamar a cliente para seguimiento"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={3}
              placeholder="Detalles adicionales de la tarea..."
            />
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-sm font-medium mb-1">Prioridad *</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="low">🟢 Baja</option>
              <option value="medium">🟡 Media</option>
              <option value="high">🟠 Alta</option>
              <option value="urgent">🔴 Urgente</option>
            </select>
          </div>

          {/* Fecha y Hora de Vencimiento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fecha de Vencimiento *</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full border rounded px-3 py-2"
                min={today}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hora de Vencimiento *</label>
              <input
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
          </div>

          {/* Recordatorio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fecha de Recordatorio</label>
              <input
                type="date"
                value={formData.reminderDate}
                onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
                className="w-full border rounded px-3 py-2"
                min={today}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hora de Recordatorio</label>
              <input
                type="time"
                value={formData.reminderTime}
                onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          {/* Repetición */}
          <div>
            <label className="block text-sm font-medium mb-1">Repetición</label>
            <select
              value={formData.recurrence}
              onChange={(e) => setFormData({ ...formData, recurrence: e.target.value as TaskRecurrence })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="none">No repetir</option>
              <option value="daily">Diaria</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>

          {/* Botones */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
