'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DynamicFeature {
  id: string;
  key: string;
  name: string;
  description: string;
  type: 'boolean' | 'number' | 'string' | 'select';
  category: string;
  defaultValue?: boolean | number | string;
  options?: string[];
  min?: number;
  max?: number;
  unit?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function DynamicFeaturesPage() {
  const [features, setFeatures] = useState<DynamicFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchFeatures();
  }, []);

  async function fetchFeatures() {
    try {
      const response = await fetch('/api/admin/dynamic-features');
      const data = await response.json();
      setFeatures(data.features || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
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
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Features Dinámicas</h1>
            <p className="text-gray-600">
              Crea y gestiona features personalizadas que se implementarán automáticamente en toda la plataforma
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
          >
            + Crear Feature Dinámica
          </button>
        </div>
      </div>

      {features.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg mb-2">No hay features dinámicas creadas</p>
          <p className="text-gray-400 text-sm">
            Crea tu primera feature dinámica para que esté disponible en todas las membresías
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{feature.name}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">{feature.key}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded text-xs ${
                    feature.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {feature.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-4">{feature.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">Tipo:</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {feature.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">Categoría:</span>
                  <span className="text-gray-600 capitalize">{feature.category}</span>
                </div>
                {feature.defaultValue !== undefined && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">Valor por defecto:</span>
                    <span className="text-gray-600">{String(feature.defaultValue)}</span>
                  </div>
                )}
                {feature.type === 'number' && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">Rango:</span>
                    <span className="text-gray-600">
                      {feature.min !== undefined ? feature.min : '∞'} - {feature.max !== undefined ? feature.max : '∞'}
                      {feature.unit && ` ${feature.unit}`}
                    </span>
                  </div>
                )}
                {feature.type === 'select' && feature.options && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">Opciones:</span>
                    <span className="text-gray-600">{feature.options.join(', ')}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // TODO: Editar feature
                    alert('Funcionalidad de edición próximamente');
                  }}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={async () => {
                    if (confirm('¿Desactivar esta feature?')) {
                      try {
                        const response = await fetch(`/api/admin/dynamic-features/${feature.id}`, {
                          method: 'DELETE',
                        });
                        if (response.ok) {
                          fetchFeatures();
                        }
                      } catch (error) {
                        console.error('Error:', error);
                      }
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                >
                  {feature.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateDynamicFeatureModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchFeatures}
        />
      )}
    </div>
  );
}

function CreateDynamicFeatureModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    type: 'boolean' as 'boolean' | 'number' | 'string' | 'select',
    category: 'custom' as string,
    defaultValue: '',
    options: '',
    min: '',
    max: '',
    unit: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar y formatear datos
      const payload: any = {
        key: formData.key,
        name: formData.name,
        description: formData.description,
        type: formData.type,
        category: formData.category,
        isActive: formData.isActive,
      };

      // Valor por defecto según tipo
      if (formData.defaultValue) {
        if (formData.type === 'boolean') {
          payload.defaultValue = formData.defaultValue === 'true';
        } else if (formData.type === 'number') {
          payload.defaultValue = parseFloat(formData.defaultValue);
        } else {
          payload.defaultValue = formData.defaultValue;
        }
      }

      // Opciones para select
      if (formData.type === 'select' && formData.options) {
        payload.options = formData.options.split(',').map((o) => o.trim()).filter(Boolean);
      }

      // Min/Max para number
      if (formData.type === 'number') {
        if (formData.min) payload.min = parseFloat(formData.min);
        if (formData.max) payload.max = parseFloat(formData.max);
        if (formData.unit) payload.unit = formData.unit;
      }

      const response = await fetch('/api/admin/dynamic-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onClose();
        onSuccess();
        alert('Feature dinámica creada exitosamente. Ya está disponible en todas las membresías.');
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Error al crear feature'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear feature');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Crear Feature Dinámica</h2>
          <p className="text-sm text-gray-600 mt-2">
            Esta feature estará disponible automáticamente en todas las membresías
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Clave Única <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              className="w-full border rounded px-3 py-2 font-mono"
              placeholder="mi_feature_personalizada"
              required
              pattern="[a-z0-9_]+"
              title="Solo letras minúsculas, números y guiones bajos"
            />
            <p className="text-xs text-gray-500 mt-1">
              Solo letras minúsculas, números y guiones bajos. Ej: mi_feature_personalizada
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Nombre para Mostrar <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="Mi Feature Personalizada"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={3}
              placeholder="Descripción de qué hace esta feature..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="boolean">Boolean (Sí/No)</option>
                <option value="number">Número</option>
                <option value="string">Texto</option>
                <option value="select">Selección</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="domains">Dominios</option>
                <option value="ai">IA</option>
                <option value="social">Redes Sociales</option>
                <option value="marketplace">Marketplace</option>
                <option value="reports">Reportes</option>
                <option value="api">API</option>
                <option value="marketing">Marketing</option>
                <option value="crm">CRM</option>
                <option value="content">Contenido</option>
                <option value="services">Servicios</option>
                <option value="support">Soporte</option>
                <option value="custom">Personalizada</option>
              </select>
            </div>
          </div>

          {formData.type === 'boolean' && (
            <div>
              <label className="block text-sm font-medium mb-2">Valor por Defecto</label>
              <select
                value={formData.defaultValue}
                onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Sin valor por defecto</option>
                <option value="true">true (Sí)</option>
                <option value="false">false (No)</option>
              </select>
            </div>
          )}

          {formData.type === 'number' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Valor Mínimo</label>
                  <input
                    type="number"
                    value={formData.min}
                    onChange={(e) => setFormData({ ...formData, min: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Valor Máximo</label>
                  <input
                    type="number"
                    value={formData.max}
                    onChange={(e) => setFormData({ ...formData, max: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Unidad</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="GB, MB, veces..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Valor por Defecto</label>
                <input
                  type="number"
                  value={formData.defaultValue}
                  onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </>
          )}

          {formData.type === 'string' && (
            <div>
              <label className="block text-sm font-medium mb-2">Valor por Defecto</label>
              <input
                type="text"
                value={formData.defaultValue}
                onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          )}

          {formData.type === 'select' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Opciones <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="opcion1, opcion2, opcion3"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separa las opciones con comas
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Valor por Defecto</label>
                <input
                  type="text"
                  value={formData.defaultValue}
                  onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Una de las opciones"
                />
              </div>
            </>
          )}

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
              {loading ? 'Creando...' : 'Crear Feature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}





