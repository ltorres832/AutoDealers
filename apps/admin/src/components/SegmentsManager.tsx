'use client';

import { useState, useEffect } from 'react';

interface Segment {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  conditions: any[];
  leadCount?: number;
}

interface SegmentsManagerProps {
  tenantId?: string;
}

export default function SegmentsManager({ tenantId }: SegmentsManagerProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadSegments();
  }, [tenantId]);

  async function loadSegments() {
    try {
      setLoading(true);
      const params = tenantId ? `?tenantId=${tenantId}` : '';
      const response = await fetch(`/api/admin/segments${params}`, {
        credentials: 'include',
      });
      const data = await response.json();
      setSegments(data.segments || []);
    } catch (error) {
      console.error('Error loading segments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSegment(segmentId: string) {
    if (!confirm('¿Estás seguro de eliminar este segmento?')) return;

    try {
      const params = new URLSearchParams();
      if (tenantId) params.append('tenantId', tenantId);
      
      const response = await fetch(`/api/admin/segments/${segmentId}?${params}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setSegments((prev) => prev.filter((s) => s.id !== segmentId));
      }
    } catch (error) {
      console.error('Error deleting segment:', error);
      alert('Error al eliminar el segmento');
    }
  }

  async function refreshSegment(segmentId: string) {
    try {
      const params = new URLSearchParams();
      if (tenantId) params.append('tenantId', tenantId);
      
      const response = await fetch(`/api/admin/segments/${segmentId}/refresh?${params}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        loadSegments();
      }
    } catch (error) {
      console.error('Error refreshing segment:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Gestión de Segmentos</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
        >
          Nuevo Segmento
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {segments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay segmentos creados. Crea tu primer segmento para comenzar.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Condiciones
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Leads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {segments.map((segment) => (
                <tr key={segment.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{segment.name}</div>
                    {segment.description && (
                      <div className="text-sm text-gray-500">{segment.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {segment.conditions.map((c, i) => (
                        <span key={i} className="block">
                          {c.field} {c.operator} {String(c.value)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium">{segment.leadCount || 0}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => refreshSegment(segment.id)}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      Actualizar
                    </button>
                    <button
                      onClick={() => deleteSegment(segment.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && (
        <CreateSegmentModal
          tenantId={tenantId}
          onClose={() => {
            setShowCreateModal(false);
            loadSegments();
          }}
        />
      )}
    </div>
  );
}

function CreateSegmentModal({
  tenantId,
  onClose,
}: {
  tenantId?: string;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    conditions: [{ field: 'status', operator: 'equals', value: 'new' }],
  });

  function addCondition() {
    setFormData({
      ...formData,
      conditions: [
        ...formData.conditions,
        { field: 'status', operator: 'equals', value: '' },
      ],
    });
  }

  function updateCondition(index: number, updates: any) {
    const newConditions = [...formData.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setFormData({ ...formData, conditions: newConditions });
  }

  function removeCondition(index: number) {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          segment: formData,
        }),
      });

      if (response.ok) {
        onClose();
      } else {
        throw new Error('Error al crear segmento');
      }
    } catch (error) {
      console.error('Error creating segment:', error);
      alert('Error al crear el segmento');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Nuevo Segmento</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={2}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Condiciones</label>
              <button
                type="button"
                onClick={addCondition}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                + Agregar Condición
              </button>
            </div>
            <div className="space-y-2">
              {formData.conditions.map((condition, index) => (
                <div key={index} className="flex gap-2 items-end border p-2 rounded">
                  <select
                    value={condition.field}
                    onChange={(e) => updateCondition(index, { field: e.target.value })}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="tags">Etiquetas</option>
                    <option value="score">Score</option>
                    <option value="source">Fuente</option>
                    <option value="status">Estado</option>
                    <option value="assignedTo">Asignado a</option>
                    <option value="createdAt">Fecha de creación</option>
                  </select>
                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(index, { operator: e.target.value })}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="equals">Igual a</option>
                    <option value="not_equals">No igual a</option>
                    <option value="contains">Contiene</option>
                    <option value="greaterThan">Mayor que</option>
                    <option value="lessThan">Menor que</option>
                    <option value="in">En lista</option>
                  </select>
                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    placeholder="Valor"
                  />
                  {formData.conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCondition(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Crear Segmento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
