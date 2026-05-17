'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import type { CrmSlaConfig } from '@autodealers/crm';
import { DEFAULT_CRM_SLA } from '@autodealers/crm';

export default function CrmSlaSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<CrmSlaConfig>({ ...DEFAULT_CRM_SLA });

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchWithAuth('/api/settings/crm-sla', {});
        if (res.ok) {
          const data = await res.json();
          if (data.config) setCfg(data.config as CrmSlaConfig);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchWithAuth('/api/settings/crm-sla', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setCfg(data.config as CrmSlaConfig);
        alert('SLA guardado');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(typeof err?.error === 'string' ? err.error : 'Error al guardar');
      }
    } catch (e) {
      console.error(e);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-600">Cargando SLA…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-900">CRM — SLA y alertas</h1>
      <p className="mt-1 text-sm text-gray-600">
        Define cuántas horas pueden pasar <strong>sin contacto ni actividad</strong> antes de marcar leads en
        amarillo (advertencia) o rojo (crítico) en la lista y el Kanban. Los cerrados / perdidos no se marcan.
      </p>

      <form onSubmit={handleSave} className="mt-6 space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
            className="h-4 w-4"
          />
          <span className="font-medium">Activar alertas visuales de SLA</span>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700">Horas sin toque — leads nuevos</label>
          <input
            type="number"
            min={1}
            max={720}
            value={cfg.staleHoursNew}
            onChange={(e) => setCfg({ ...cfg, staleHoursNew: parseInt(e.target.value, 10) || 1 })}
            className="mt-1 w-full rounded border px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            Umbral <strong>advertencia</strong>. Crítico = este valor × multiplicador ({cfg.criticalMultiplier}).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Horas sin toque — leads en seguimiento</label>
          <input
            type="number"
            min={1}
            max={720}
            value={cfg.staleHoursActive}
            onChange={(e) => setCfg({ ...cfg, staleHoursActive: parseInt(e.target.value, 10) || 1 })}
            className="mt-1 w-full rounded border px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            Para estados distintos de “nuevo” (contactado, calificado, cita, etc.).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Multiplicador “crítico”</label>
          <input
            type="number"
            step={0.1}
            min={1.1}
            max={5}
            value={cfg.criticalMultiplier}
            onChange={(e) =>
              setCfg({ ...cfg, criticalMultiplier: parseFloat(e.target.value) || DEFAULT_CRM_SLA.criticalMultiplier })
            }
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <Link href="/leads" className="rounded-lg border border-gray-300 px-5 py-2 hover:bg-gray-50">
            Ver leads
          </Link>
          <Link href="/settings/crm-lead-routing" className="rounded-lg px-5 py-2 text-primary-700 hover:underline">
            Reglas de asignación
          </Link>
        </div>
      </form>
    </div>
  );
}
