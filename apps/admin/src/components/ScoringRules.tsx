'use client';

import { useState, useEffect } from 'react';
import { ScoringRule } from '@autodealers/crm';

interface ScoringRulesProps {
  tenantId?: string;
}

export default function ScoringRules({ tenantId }: ScoringRulesProps) {
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadRules();
  }, [tenantId]);

  async function loadRules() {
    try {
      setLoading(true);
      const params = tenantId ? `?tenantId=${tenantId}` : '';
      const response = await fetch(`/api/admin/scoring/rules${params}`, {
        credentials: 'include',
      });
      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleRule(ruleId: string, enabled: boolean) {
    try {
      const response = await fetch(`/api/admin/scoring/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        setRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, enabled } : r))
        );
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  }

  async function deleteRule(ruleId: string) {
    if (!confirm('¿Estás seguro de eliminar esta regla?')) return;

    try {
      const response = await fetch(`/api/admin/scoring/rules/${ruleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setRules((prev) => prev.filter((r) => r.id !== ruleId));
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
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
        <h2 className="text-xl font-bold">Reglas de Scoring</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
        >
          Nueva Regla
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Condiciones
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Puntos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prioridad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rules.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No hay reglas configuradas. Crea una nueva regla para comenzar.
                </td>
              </tr>
            ) : (
              rules
                .sort((a, b) => a.priority - b.priority)
                .map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {rule.conditions.map((c, i) => (
                          <span key={i} className="block">
                            {c.field} {c.operator} {String(c.value)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">+{rule.points}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{rule.priority}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => toggleRule(rule.id, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <CreateRuleModal
          tenantId={tenantId}
          onClose={() => {
            setShowCreateModal(false);
            loadRules();
          }}
        />
      )}
    </div>
  );
}

function CreateRuleModal({
  tenantId,
  onClose,
}: {
  tenantId?: string;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    points: 10,
    priority: 1,
    enabled: true,
    conditions: [{ field: 'source', operator: 'equals', value: 'web' }],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/scoring/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          rule: formData,
        }),
      });

      if (response.ok) {
        onClose();
      } else {
        throw new Error('Error al crear regla');
      }
    } catch (error) {
      console.error('Error creating rule:', error);
      alert('Error al crear la regla');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Nueva Regla de Scoring</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre de la Regla</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Puntos</label>
              <input
                type="number"
                required
                min="1"
                value={formData.points}
                onChange={(e) =>
                  setFormData({ ...formData, points: parseInt(e.target.value) || 0 })
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prioridad</label>
              <input
                type="number"
                required
                min="1"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="mr-2"
            />
            <label className="text-sm">Regla habilitada</label>
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
              Crear Regla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
