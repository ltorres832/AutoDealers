'use client';

import { useState } from 'react';
import { Workflow } from '@autodealers/crm';
import { useRealtimeWorkflows } from '@/hooks/useRealtimeWorkflows';

interface WorkflowsListProps {
  tenantId: string;
}

export default function WorkflowsList({ tenantId }: WorkflowsListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Usar hook de tiempo real
  const { workflows, loading } = useRealtimeWorkflows({
    tenantId,
  });

  async function handleToggleEnabled(workflowId: string, enabled: boolean) {
    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled }),
      });
      // No necesitamos recargar, el hook de tiempo real actualizará automáticamente
    } catch (error) {
      console.error('Error updating workflow:', error);
      alert('Error al actualizar el workflow');
    }
  }

  function getTriggerLabel(trigger: string) {
    const labels: Record<string, string> = {
      lead_created: 'Lead Creado',
      lead_status_changed: 'Cambio de Estado',
      lead_score_changed: 'Cambio de Score',
      lead_no_response: 'Sin Respuesta',
      appointment_confirmed: 'Cita Confirmada',
      appointment_cancelled: 'Cita Cancelada',
      message_received: 'Mensaje Recibido',
      task_completed: 'Tarea Completada',
      document_uploaded: 'Documento Subido',
    };
    return labels[trigger] || trigger;
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
        <h3 className="font-semibold">Workflows Automatizados</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          + Nuevo Workflow
        </button>
      </div>

      <div className="divide-y">
        {workflows.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No hay workflows configurados
            <br />
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Crear Primer Workflow
            </button>
          </div>
        ) : (
          workflows.map((workflow) => (
            <div key={workflow.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{workflow.name}</h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        workflow.enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {workflow.enabled ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {workflow.description && (
                    <p className="text-sm text-gray-600 mb-2">{workflow.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                    <span>
                      <strong>Trigger:</strong> {getTriggerLabel(workflow.trigger)}
                    </span>
                    <span>
                      <strong>Acciones:</strong> {workflow.actions.length}
                    </span>
                    <span>
                      <strong>Ejecuciones:</strong> {workflow.executionCount}
                    </span>
                    {workflow.lastExecutedAt && (
                      <span>
                        Última ejecución: {new Date(workflow.lastExecutedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {workflow.actions.map((action, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                      >
                        {action.type}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleEnabled(workflow.id, !workflow.enabled)}
                    className={`px-3 py-1 text-sm rounded ${
                      workflow.enabled
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {workflow.enabled ? 'Desactivar' : 'Activar'}
                  </button>
                  <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                    Editar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateWorkflowModal
          tenantId={tenantId}
          onClose={() => {
            setShowCreateModal(false);
            // Workflows will be updated automatically via realtime hook
          }}
        />
      )}
    </div>
  );
}

function CreateWorkflowModal({
  tenantId,
  onClose,
}: {
  tenantId: string;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    enabled: true,
    trigger: 'lead_created' as const,
    actions: [] as any[],
  });
  const [loading, setLoading] = useState(false);
  const [showAddAction, setShowAddAction] = useState(false);
  const [newAction, setNewAction] = useState({
    type: 'change_status' as 'change_status' | 'create_task' | 'add_tag',
    config: {} as any,
    delay: 0,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (formData.actions.length === 0) {
      alert('Debes agregar al menos una acción');
      return;
    }

    setLoading(true);

    try {
      await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      onClose();
    } catch (error) {
      console.error('Error creating workflow:', error);
      alert('Error al crear el workflow');
    } finally {
      setLoading(false);
    }
  }

  function addAction() {
    setFormData({
      ...formData,
      actions: [...formData.actions, { ...newAction }],
    });
    setNewAction({
      type: 'change_status',
      config: {},
      delay: 0,
    });
    setShowAddAction(false);
  }

  function removeAction(index: number) {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Crear Nuevo Workflow</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Nombre *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              rows={2}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Trigger (Disparador) *</label>
            <select
              value={formData.trigger}
              onChange={(e) => setFormData({ ...formData, trigger: e.target.value as any })}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="lead_created">Lead Creado</option>
              <option value="lead_status_changed">Cambio de Estado</option>
              <option value="lead_score_changed">Cambio de Score</option>
              <option value="lead_no_response">Sin Respuesta</option>
              <option value="appointment_confirmed">Cita Confirmada</option>
              <option value="appointment_cancelled">Cita Cancelada</option>
              <option value="message_received">Mensaje Recibido</option>
              <option value="task_completed">Tarea Completada</option>
              <option value="document_uploaded">Documento Subido</option>
            </select>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Acciones *</label>
              <button
                type="button"
                onClick={() => setShowAddAction(true)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                + Agregar Acción
              </button>
            </div>

            {formData.actions.length === 0 ? (
              <div className="text-sm text-gray-500 p-4 border rounded bg-gray-50">
                No hay acciones. Agrega al menos una acción.
              </div>
            ) : (
              <div className="space-y-2">
                {formData.actions.map((action, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded bg-gray-50">
                    <div>
                      <span className="font-medium">{action.type}</span>
                      {action.delay > 0 && (
                        <span className="text-xs text-gray-500 ml-2">
                          (Retraso: {action.delay}s)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAction(idx)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showAddAction && (
              <div className="mt-4 p-4 border rounded bg-gray-50">
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-2">Tipo de Acción</label>
                  <select
                    value={newAction.type}
                    onChange={(e) => setNewAction({ ...newAction, type: e.target.value as any })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="change_status">Cambiar Estado</option>
                    <option value="assign_to_user">Asignar a Usuario</option>
                    <option value="send_email">Enviar Email</option>
                    <option value="send_whatsapp">Enviar WhatsApp</option>
                    <option value="create_task">Crear Tarea</option>
                    <option value="add_tag">Agregar Etiqueta</option>
                    <option value="update_score">Actualizar Score</option>
                    <option value="notify_user">Notificar Usuario</option>
                  </select>
                </div>

                {newAction.type === 'change_status' && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-2">Nuevo Estado</label>
                    <select
                      value={newAction.config.status || ''}
                      onChange={(e) =>
                        setNewAction({
                          ...newAction,
                          config: { ...newAction.config, status: e.target.value },
                        })
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="contacted">Contactado</option>
                      <option value="qualified">Calificado</option>
                      <option value="appointment">Cita</option>
                      <option value="negotiation">Negociación</option>
                    </select>
                  </div>
                )}

                {newAction.type === 'create_task' && (
                  <>
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-2">Título de Tarea</label>
                      <input
                        type="text"
                        value={newAction.config.title || ''}
                        onChange={(e) =>
                          setNewAction({
                            ...newAction,
                            config: { ...newAction.config, title: e.target.value },
                          })
                        }
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-2">Asignar a</label>
                      <input
                        type="text"
                        placeholder="ID de usuario o dejar vacío"
                        value={newAction.config.assignedTo || ''}
                        onChange={(e) =>
                          setNewAction({
                            ...newAction,
                            config: { ...newAction.config, assignedTo: e.target.value },
                          })
                        }
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  </>
                )}

                {newAction.type === 'add_tag' && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-2">Etiqueta</label>
                    <input
                      type="text"
                      value={newAction.config.tag || ''}
                      onChange={(e) =>
                        setNewAction({
                          ...newAction,
                          config: { ...newAction.config, tag: e.target.value },
                        })
                      }
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label className="block text-sm font-medium mb-2">Retraso (segundos)</label>
                  <input
                    type="number"
                    min="0"
                    value={newAction.delay}
                    onChange={(e) =>
                      setNewAction({ ...newAction, delay: parseInt(e.target.value) || 0 })
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addAction}
                    className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                  >
                    Agregar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddAction(false)}
                    className="px-4 py-2 border rounded"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">Activar workflow inmediatamente</span>
            </label>
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
              {loading ? 'Creando...' : 'Crear Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

