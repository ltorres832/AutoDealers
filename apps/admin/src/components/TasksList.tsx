'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Task, TaskType, TaskStatus, TaskPriority } from '@autodealers/crm';
import CreateTaskModal from './CreateTaskModal';

interface TasksListProps {
  leadId?: string;
  assignedTo?: string;
  tenantId?: string;
  onTaskComplete?: () => void;
}

export default function TasksList({ leadId, assignedTo, tenantId, onTaskComplete }: TasksListProps) {
  const { auth } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '' as TaskStatus | '',
    type: '' as TaskType | '',
    priority: '' as TaskPriority | '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

  const effectiveTenantId = tenantId || auth?.tenantId;

  useEffect(() => {
    loadTasks();
  }, [leadId, assignedTo, filters, effectiveTenantId]);

  async function loadTasks() {
    if (!effectiveTenantId) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (leadId) params.append('leadId', leadId);
      if (assignedTo) params.append('assignedTo', assignedTo);
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.priority) params.append('priority', filters.priority);
      
      // Si es admin y especificó tenantId, usar API de admin
      const apiPath = tenantId && auth?.role === 'admin' 
        ? `/api/admin/tasks?tenantId=${tenantId}&${params.toString()}`
        : `/api/tasks?${params.toString()}`;

      const response = await fetch(apiPath, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but got ${contentType}: ${text.substring(0, 100)}`);
      }
      
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteTask(taskId: string) {
    if (!effectiveTenantId) return;

    try {
      const apiPath = tenantId && auth?.role === 'admin'
        ? `/api/admin/tasks/${taskId}`
        : `/api/tasks/${taskId}/complete`;
      
      const method = tenantId && auth?.role === 'admin' ? 'POST' : 'POST';
      const body = tenantId && auth?.role === 'admin' 
        ? JSON.stringify({ action: 'complete', tenantId })
        : undefined;

      const response = await fetch(apiPath, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
        credentials: 'include',
      });

      if (response.ok) {
        loadTasks();
        onTaskComplete?.();
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Error al completar la tarea');
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!effectiveTenantId) return;

    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;

    try {
      const apiPath = tenantId && auth?.role === 'admin'
        ? `/api/admin/tasks/${taskId}`
        : `/api/tasks/${taskId}`;
      
      const body = tenantId && auth?.role === 'admin'
        ? JSON.stringify({ tenantId })
        : undefined;

      const response = await fetch(apiPath, {
        method: 'DELETE',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
        credentials: 'include',
      });

      if (response.ok) {
        loadTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error al eliminar la tarea');
    }
  }

  const getTaskTypeIcon = (type: TaskType) => {
    const icons: Record<TaskType, string> = {
      call: '📞',
      email: '📧',
      whatsapp: '💬',
      meeting: '📅',
      follow_up: '🔄',
      document: '📄',
      custom: '📝',
    };
    return icons[type] || '📝';
  };

  const getTaskTypeLabel = (type: TaskType) => {
    const labels: Record<TaskType, string> = {
      call: 'Llamada',
      email: 'Email',
      whatsapp: 'WhatsApp',
      meeting: 'Reunión',
      follow_up: 'Seguimiento',
      document: 'Documento',
      custom: 'Personalizada',
    };
    return labels[type] || type;
  };

  const getPriorityColor = (priority: TaskPriority) => {
    const colors: Record<TaskPriority, string> = {
      low: 'bg-green-100 text-green-700 border-green-300',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      high: 'bg-orange-100 text-orange-700 border-orange-300',
      urgent: 'bg-red-100 text-red-700 border-red-300',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status: TaskStatus) => {
    const colors: Record<TaskStatus, string> = {
      pending: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const isOverdue = (dueDate: Date) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const isDueToday = (dueDate: Date) => {
    const today = new Date();
    const due = new Date(dueDate);
    return due.toDateString() === today.toDateString();
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Tareas</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 text-sm"
        >
          + Nueva Tarea
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Estado</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as TaskStatus | '' })}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En Progreso</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tipo</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value as TaskType | '' })}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="call">Llamada</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="meeting">Reunión</option>
            <option value="follow_up">Seguimiento</option>
            <option value="document">Documento</option>
            <option value="custom">Personalizada</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Prioridad</label>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value as TaskPriority | '' })}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>
      </div>

      {/* Tareas Pendientes */}
      {pendingTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Pendientes ({pendingTasks.length})</h3>
          <div className="space-y-2">
            {pendingTasks.map((task) => {
              const overdue = isOverdue(task.dueDate);
              const dueToday = isDueToday(task.dueDate);
              
              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${
                    overdue ? 'border-red-500' : dueToday ? 'border-yellow-500' : 'border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{getTaskTypeIcon(task.type)}</span>
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                          {task.priority === 'urgent' ? 'Urgente' :
                           task.priority === 'high' ? 'Alta' :
                           task.priority === 'medium' ? 'Media' : 'Baja'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(task.status)}`}>
                          {task.status === 'pending' ? 'Pendiente' :
                           task.status === 'in_progress' ? 'En Progreso' : task.status}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          📅 {new Date(task.dueDate).toLocaleDateString()} {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {overdue && (
                          <span className="text-red-600 font-semibold">⚠️ Vencida</span>
                        )}
                        {dueToday && !overdue && (
                          <span className="text-yellow-600 font-semibold">⚠️ Vence hoy</span>
                        )}
                        {task.reminderDate && (
                          <span>🔔 Recordatorio: {new Date(task.reminderDate).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {task.status !== 'completed' && (
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          ✓ Completar
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tareas Completadas */}
      {completedTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Completadas ({completedTasks.length})</h3>
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="bg-gray-50 rounded-lg shadow-sm p-4 border-l-4 border-green-500 opacity-75"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{getTaskTypeIcon(task.type)}</span>
                      <h4 className="font-medium text-gray-700 line-through">{task.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(task.status)}`}>
                        Completada
                      </span>
                    </div>
                    {task.completedAt && (
                      <span className="text-xs text-gray-500">
                        Completada el {new Date(task.completedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No hay tareas</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-primary-600 hover:text-primary-700"
          >
            Crear primera tarea
          </button>
        </div>
      )}

      {showCreateModal && (
        <CreateTaskModal
          leadId={leadId}
          assignedTo={assignedTo || auth?.userId}
          onClose={() => {
            setShowCreateModal(false);
            loadTasks();
          }}
        />
      )}
    </div>
  );
}
