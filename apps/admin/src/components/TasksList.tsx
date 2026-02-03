'use client';

import { useState, useEffect } from 'react';
import { Task } from '@autodealers/crm';
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';

interface TasksListProps {
  tenantId?: string; // Opcional para admin
  leadId?: string;
  assignedTo?: string;
}

export default function TasksList({ tenantId, leadId, assignedTo }: TasksListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Usar hook de tiempo real si hay tenantId, sino usar fetch
  const { tasks: realtimeTasks, loading: tasksLoading } = useRealtimeTasks({
    tenantId,
    assignedTo,
    leadId,
    status: filter !== 'all' ? filter : undefined,
  });

  // Si no hay tenantId, usar fetch (para admin viendo todos)
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);

  // Filtrar tareas según el filtro seleccionado
  const tasks = tenantId 
    ? (filter === 'all' ? realtimeTasks : realtimeTasks.filter(t => t.status === filter))
    : allTasks;
  
  const loading = tenantId ? tasksLoading : fetchLoading;

  async function handleComplete(taskId: string) {
    try {
      await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'complete', tenantId }),
      });
      // Si hay tenantId, el hook de tiempo real actualizará automáticamente
      // Si no hay tenantId, recargar manualmente
      if (!tenantId) {
        const params = new URLSearchParams();
        if (leadId) params.append('leadId', leadId);
        if (assignedTo) params.append('assignedTo', assignedTo);
        if (filter !== 'all') params.append('status', filter);
        fetch(`/api/admin/tasks?${params.toString()}`, {
          credentials: 'include',
        })
          .then(res => res.json())
          .then(data => setAllTasks(data.tasks || []))
          .catch(err => console.error('Error reloading tasks:', err));
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Error al completar la tarea');
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'call':
        return '📞';
      case 'email':
        return '📧';
      case 'whatsapp':
        return '💬';
      case 'meeting':
        return '🤝';
      case 'follow_up':
        return '🔄';
      case 'document':
        return '📄';
      default:
        return '📋';
    }
  }

  function formatDate(date: Date | string) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) {
      return `Hoy ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (d.toDateString() === tomorrow.toDateString()) {
      return `Mañana ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function isOverdue(task: Task) {
    return task.status === 'pending' && new Date(task.dueDate) < new Date();
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'all' ? 'bg-primary-600 text-white' : 'bg-white border'
            }`}
          >
            Todas ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'pending' ? 'bg-primary-600 text-white' : 'bg-white border'
            }`}
          >
            Pendientes ({tasks.filter(t => t.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'completed' ? 'bg-primary-600 text-white' : 'bg-white border'
            }`}
          >
            Completadas ({tasks.filter(t => t.status === 'completed').length})
          </button>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          + Nueva Tarea
        </button>
      </div>

      <div className="divide-y">
        {tasks.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No hay tareas que mostrar
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                task.status === 'completed' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getTypeIcon(task.type)}</span>
                    <h4 className={`font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>
                      {task.title}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {isOverdue(task) && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                        Vencida
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>📅 {formatDate(task.dueDate)}</span>
                    {task.leadId && (
                      <span className="text-blue-600">Lead relacionado</span>
                    )}
                    {task.recurrence !== 'none' && (
                      <span className="text-purple-600">🔄 {task.recurrence}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {task.status !== 'completed' && (
                    <button
                      onClick={() => handleComplete(task.id)}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      Completar
                    </button>
                  )}
                  {task.status === 'completed' && (
                    <span className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded">
                      ✓ Completada
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateTaskModal
          tenantId={tenantId}
          leadId={leadId}
          onClose={() => {
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

function CreateTaskModal({
  tenantId,
  leadId,
  onClose,
}: {
  tenantId?: string;
  leadId?: string;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    type: 'follow_up' as const,
    title: '',
    description: '',
    priority: 'medium' as const,
    dueDate: '',
    dueTime: '',
    reminderDate: '',
    reminderTime: '',
    recurrence: 'none' as const,
    assignedTo: '',
  });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/users', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUsers(data.users || []))
      .catch(err => console.error('Error fetching users:', err));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime || '12:00'}`);
      const reminderDateTime = formData.reminderDate
        ? new Date(`${formData.reminderDate}T${formData.reminderTime || '09:00'}`)
        : undefined;

      await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId: tenantId || undefined,
          type: formData.type,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          dueDate: dueDateTime.toISOString(),
          reminderDate: reminderDateTime?.toISOString(),
          recurrence: formData.recurrence,
          assignedTo: formData.assignedTo || undefined,
          leadId: leadId || undefined,
        }),
      });

      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Error al crear la tarea');
    } finally {
      setLoading(false);
    }
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Crear Nueva Tarea</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="call">📞 Llamada</option>
                <option value="email">📧 Email</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="meeting">🤝 Reunión</option>
                <option value="follow_up">🔄 Seguimiento</option>
                <option value="document">📄 Documento</option>
                <option value="custom">📋 Personalizada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Prioridad</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Título *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha de Vencimiento *</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full border rounded px-3 py-2"
                min={minDate}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Hora</label>
              <input
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha de Recordatorio</label>
              <input
                type="date"
                value={formData.reminderDate}
                onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
                className="w-full border rounded px-3 py-2"
                min={minDate}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Hora de Recordatorio</label>
              <input
                type="time"
                value={formData.reminderTime}
                onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Repetición</label>
              <select
                value={formData.recurrence}
                onChange={(e) => setFormData({ ...formData, recurrence: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="none">No repetir</option>
                <option value="daily">Diaria</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Asignar a</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Yo mismo</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
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
              {loading ? 'Creando...' : 'Crear Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

