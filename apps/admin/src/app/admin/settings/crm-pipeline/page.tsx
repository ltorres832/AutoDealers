'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CrmPipelineSettings, CrmPipelineStageRow } from '@autodealers/core';

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Azul' },
  { value: 'yellow', label: 'Amarillo' },
  { value: 'green', label: 'Verde' },
  { value: 'purple', label: 'Morado' },
  { value: 'indigo', label: 'Índigo' },
  { value: 'pink', label: 'Rosa' },
  { value: 'orange', label: 'Naranja' },
  { value: 'gray', label: 'Gris' },
  { value: 'red', label: 'Rojo' },
];

export default function CrmPipelineSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [stages, setStages] = useState<CrmPipelineStageRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings/crm-pipeline');
        if (res.ok) {
          const data = (await res.json()) as CrmPipelineSettings;
          setEnabled(data.enabled !== false);
          setStages(data.stages?.length ? [...data.stages].sort((a, b) => a.order - b.order) : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function updateStage(idx: number, patch: Partial<CrmPipelineStageRow>) {
    setStages((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/crm-pipeline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, stages } satisfies CrmPipelineSettings),
      });
      if (res.ok) {
        alert('Pipeline CRM guardado');
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Pipeline CRM (Kanban)</h1>
      <p className="text-sm text-gray-600 mb-6">
        Define las etapas y etiquetas que verán dealers y vendedores en el tablero de leads. Los estados deben
        coincidir con el flujo del CRM (arrastrar tarjeta actualiza el estado del lead).
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span className="font-medium">Usar esta configuración en el Kanban</span>
          </label>
          <p className="text-xs text-gray-500 mt-2">
            Si se desactiva, la app usa las etiquetas por defecto del sistema.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
          <h2 className="font-semibold mb-4">Etapas</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-2">Estado (clave)</th>
                <th className="py-2 pr-2">Etiqueta visible</th>
                <th className="py-2 pr-2">Color</th>
                <th className="py-2">Orden</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((row, idx) => (
                <tr key={row.status} className="border-b">
                  <td className="py-2 pr-2 font-mono text-xs">{row.status}</td>
                  <td className="py-2 pr-2">
                    <input
                      className="w-full border rounded px-2 py-1"
                      value={row.label}
                      onChange={(e) => updateStage(idx, { label: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      className="border rounded px-2 py-1"
                      value={row.color}
                      onChange={(e) => updateStage(idx, { color: e.target.value })}
                    >
                      {COLOR_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      className="w-20 border rounded px-2 py-1"
                      value={row.order}
                      onChange={(e) =>
                        updateStage(idx, { order: parseInt(e.target.value, 10) || 0 })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2 border rounded-lg">
            Volver
          </button>
        </div>
      </form>
    </div>
  );
}
