'use client';

import { useState, useEffect } from 'react';
import { ScoringConfig as ScoringConfigType } from '@autodealers/crm';

interface ScoringConfigProps {
  tenantId?: string;
}

export default function ScoringConfig({ tenantId }: ScoringConfigProps) {
  const [config, setConfig] = useState<ScoringConfigType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [tenantId]);

  async function loadConfig() {
    try {
      setLoading(true);
      const params = tenantId ? `?tenantId=${tenantId}` : '';
      const response = await fetch(`/api/admin/scoring/config${params}`, {
        credentials: 'include',
      });
      const data = await response.json();
      setConfig(data.config);
    } catch (error) {
      console.error('Error loading scoring config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    if (!config) return;

    try {
      setSaving(true);
      const response = await fetch('/api/admin/scoring/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId: tenantId || config.tenantId,
          config: {
            enabled: config.enabled,
            autoCalculate: config.autoCalculate,
            manualOverride: config.manualOverride,
            maxScore: config.maxScore,
            weights: config.weights,
          },
        }),
      });

      if (response.ok) {
        alert('Configuración guardada exitosamente');
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!config) {
    return <div>No se encontró configuración</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Configuración General</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium">Sistema de Scoring Habilitado</label>
            <p className="text-sm text-gray-500">Activa o desactiva el sistema de scoring</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium">Cálculo Automático</label>
            <p className="text-sm text-gray-500">Calcula scores automáticamente cuando cambia un lead</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoCalculate}
              onChange={(e) => setConfig({ ...config, autoCalculate: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium">Permitir Override Manual</label>
            <p className="text-sm text-gray-500">Permite que los vendedores ajusten scores manualmente</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.manualOverride}
              onChange={(e) => setConfig({ ...config, manualOverride: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div>
          <label className="block font-medium mb-2">Score Máximo</label>
          <input
            type="number"
            min="0"
            max="1000"
            value={config.maxScore}
            onChange={(e) => setConfig({ ...config, maxScore: parseInt(e.target.value) || 100 })}
            className="w-full max-w-xs border rounded px-3 py-2"
          />
          <p className="text-sm text-gray-500 mt-1">Puntuación máxima que puede alcanzar un lead (0-1000)</p>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium mb-4">Pesos de Scoring</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Peso Automático: {((config.weights?.automatic || 0.7) * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.weights?.automatic || 0.7}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    weights: {
                      automatic: parseFloat(e.target.value),
                      manual: config.weights?.manual || 0.3,
                    },
                  })
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Peso Manual: {((config.weights?.manual || 0.3) * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.weights?.manual || 0.3}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    weights: {
                      automatic: config.weights?.automatic || 0.7,
                      manual: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            El score combinado se calcula como: (Score Automático × Peso Automático) + (Score Manual × Peso Manual)
          </p>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-2 rounded hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}
