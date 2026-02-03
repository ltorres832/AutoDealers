'use client';

import { useState, useEffect } from 'react';
import { FIWorkflow } from '@autodealers/crm';

export default function FIWorkflowsManager() {
  const [workflows, setWorkflows] = useState<FIWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger: 'score_threshold' as FIWorkflow['trigger'],
    conditions: [] as Array<{ field: string; operator: string; value: any }>,
    actions: [] as Array<{ type: string; config: Record<string, any> }>,
    isActive: true,
  });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  async function fetchWorkflows() {
    try {
      setLoading(true);
      const response = await fetch('/api/fi/workflows');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      const response = await fetch('/api/fi/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({
          name: '',
          description: '',
          trigger: 'score_threshold',
          conditions: [],
          actions: [],
          isActive: true,
        });
        fetchWorkflows();
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Cargando workflows...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Workflows Automatizados F&I</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nuevo Workflow
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No hay workflows configurados. Crea uno para automatizar procesos F&I.
        </div>
      ) : (
        <div className="space-y-4">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{workflow.name}</h3>
                  {workflow.description && (
                    <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      Trigger: {workflow.trigger}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      workflow.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {workflow.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      Ejecutado {workflow.runCount} veces
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold mb-4">Crear Workflow</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
                <select
                  value={formData.trigger}
                  onChange={(e) => setFormData({ ...formData, trigger: e.target.value as FIWorkflow['trigger'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="score_threshold">Score Threshold</option>
                  <option value="dti_ratio">DTI Ratio</option>
                  <option value="credit_range">Rango de Crédito</option>
                  <option value="status_change">Cambio de Estado</option>
                  <option value="document_received">Documento Recibido</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Crear Workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


