'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

/** Mirrors packages/core DMS_DEPARTMENT_TEMPLATES keys for client UI */
const TEMPLATES: { id: string; label: string }[] = [
  { id: '', label: 'Sin plantilla (defaults vendedor)' },
  { id: 'sales', label: 'Ventas' },
  { id: 'fi', label: 'F&I' },
  { id: 'service', label: 'Taller / Servicio' },
  { id: 'parts', label: 'Piezas' },
  { id: 'finance', label: 'Finanzas' },
  { id: 'hr', label: 'RR.HH.' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'owner', label: 'Propietario / Admin' },
];

const MODULES: { id: string; label: string }[] = [
  { id: 'inventory', label: 'Inventario' },
  { id: 'crm_leads', label: 'CRM / Leads' },
  { id: 'sales', label: 'Ventas' },
  { id: 'contracts', label: 'Contratos' },
  { id: 'fi', label: 'F&I' },
  { id: 'service', label: 'Servicio' },
  { id: 'parts', label: 'Piezas' },
  { id: 'finance', label: 'Finanzas' },
  { id: 'hr_compensation', label: 'RR.HH. / Compensación' },
  { id: 'voice', label: 'Voz' },
  { id: 'marketing_social', label: 'Marketing' },
  { id: 'integrations', label: 'Integraciones' },
  { id: 'settings_users', label: 'Usuarios' },
  { id: 'reports', label: 'Reportes' },
];

const ACCESS_LEVELS = ['none', 'read', 'write', 'manage'] as const;

type Access = (typeof ACCESS_LEVELS)[number];

export function SellerDmsAccessPanel({
  sellerId,
  initialTemplate,
  initialModules,
}: {
  sellerId: string;
  initialTemplate?: string | null;
  initialModules?: Record<string, string>;
}) {
  const [template, setTemplate] = useState(initialTemplate || '');
  const [modules, setModules] = useState<Record<string, Access>>(() => {
    const out: Record<string, Access> = {};
    for (const m of MODULES) {
      const v = initialModules?.[m.id];
      out[m.id] = ACCESS_LEVELS.includes(v as Access) ? (v as Access) : 'none';
    }
    return out;
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setTemplate(initialTemplate || '');
  }, [initialTemplate]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const modulePermissions: Record<string, Access> = {};
      for (const [k, v] of Object.entries(modules)) {
        if (v && v !== 'none') modulePermissions[k] = v;
      }
      const res = await fetchWithAuth(`/api/sellers/${sellerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentTemplate: template || null,
          modulePermissions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setMsg('Acceso DMS guardado');
    } catch (e: any) {
      setMsg(e.message || 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-xl font-bold mb-2">Acceso por departamento (DMS)</h3>
      <p className="text-sm text-gray-600 mb-4">
        Asigna una plantilla y ajusta módulos. Esto controla qué puede ver/hacer el empleado.
      </p>

      <label className="block text-sm mb-4 max-w-md">
        Plantilla
        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="mt-1 w-full border rounded px-3 py-2"
        >
          {TEMPLATES.map((t) => (
            <option key={t.id || 'none'} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {MODULES.map((m) => (
          <label key={m.id} className="text-sm flex items-center justify-between gap-2 border rounded px-3 py-2">
            <span>{m.label}</span>
            <select
              value={modules[m.id] || 'none'}
              onChange={(e) =>
                setModules((prev) => ({ ...prev, [m.id]: e.target.value as Access }))
              }
              className="border rounded px-2 py-1 text-sm"
            >
              {ACCESS_LEVELS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {msg && <p className="text-sm mb-3 text-gray-700">{msg}</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="bg-primary-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar acceso DMS'}
      </button>
    </div>
  );
}
