'use client';

import { useCallback, useEffect, useState } from 'react';

type LimitRow = {
  key: string;
  label: string;
  assigned: number | null;
  usage: number;
  planCap: number | null;
  effective: number | null;
  poolRemaining: number | null;
};

type PoolInfo = {
  planCaps: Record<string, number | null>;
  assignedTotals: Record<string, number>;
  remainingPool: Record<string, number | null>;
};

export default function SellerLimitsPanel({ sellerId }: { sellerId: string }) {
  const [rows, setRows] = useState<LimitRow[]>([]);
  const [pool, setPool] = useState<PoolInfo | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const res = await fetchWithAuth(`/api/sellers/${sellerId}/limits`, {});
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudieron cargar los límites');
      }
      const data = await res.json();
      const limits = (data.limits || []) as LimitRow[];
      setRows(limits);
      setPool(data.pool || null);
      const nextDraft: Record<string, string> = {};
      for (const row of limits) {
        nextDraft[row.key] =
          row.assigned !== null && row.assigned !== undefined ? String(row.assigned) : '';
      }
      setDraft(nextDraft);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar límites');
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const limits: Record<string, number | null> = {};
      for (const row of rows) {
        const raw = draft[row.key]?.trim();
        limits[row.key] = raw ? Math.floor(Number(raw)) : null;
      }

      const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
      const res = await fetchWithAuth(`/api/sellers/${sellerId}/limits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limits }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'No se pudieron guardar los límites');
      }
      setSuccess('Límites guardados correctamente');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <p className="text-gray-500 text-sm">Cargando límites del vendedor…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6 border border-primary-100">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl font-bold">Límites de uso e inventario</h3>
          <p className="text-sm text-gray-600 mt-1">
            Asigna cuotas a este vendedor. No pueden superar los límites de tu membresía ni la suma
            asignada al resto del equipo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar límites'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2 pr-4 font-medium">Recurso</th>
              <th className="py-2 pr-4 font-medium">Uso actual</th>
              <th className="py-2 pr-4 font-medium">Asignado</th>
              <th className="py-2 pr-4 font-medium">Plan (máx.)</th>
              <th className="py-2 font-medium">Disponible en pool</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-gray-100">
                <td className="py-3 pr-4 font-medium text-gray-900">{row.label}</td>
                <td className="py-3 pr-4">
                  <span className="text-gray-800">{row.usage}</span>
                  {row.effective !== null && row.effective !== undefined && (
                    <span className="text-gray-500"> / {row.effective}</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <input
                    type="number"
                    min={0}
                    placeholder="Sin tope propio"
                    value={draft[row.key] ?? ''}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [row.key]: e.target.value }))
                    }
                    className="w-28 border border-gray-300 rounded px-2 py-1"
                  />
                </td>
                <td className="py-3 pr-4 text-gray-600">
                  {row.planCap === null || row.planCap === undefined ? 'Ilimitado' : row.planCap}
                </td>
                <td className="py-3 text-gray-600">
                  {row.poolRemaining === null || row.poolRemaining === undefined
                    ? '—'
                    : row.poolRemaining}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Deja vacío un campo para que el vendedor use el límite general del plan (sin cuota fija).
        La suma de todos los límites asignados no puede superar el tope de tu membresía.
      </p>
    </div>
  );
}
