'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import type { LeadSource } from '@autodealers/crm';

type SourceRule = { useDedicatedPool: boolean; poolUserIds: string[] };

type RoutingConfig = {
  enabled: boolean;
  strategy: 'none' | 'round_robin';
  poolUserIds: string[];
  roundRobinCursors: Partial<Record<string, number>>;
  sourceRules: Partial<Record<string, SourceRule>>;
};

type SellerRow = { id: string; name?: string; email?: string; status?: string };

const CHANNELS: { id: LeadSource; label: string }[] = [
  { id: 'web', label: 'Web / portal público' },
  { id: 'facebook', label: 'Facebook / Lead Ads' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' },
  { id: 'phone', label: 'Teléfono / showroom' },
  { id: 'manual', label: 'Manual (vendedor/dealer)' },
  { id: 'admin_manual', label: 'Manual (admin plataforma)' },
];

function emptyRule(): SourceRule {
  return { useDedicatedPool: false, poolUserIds: [] };
}

function ensureRules(cfg: RoutingConfig): RoutingConfig {
  const sourceRules: Partial<Record<string, SourceRule>> = { ...cfg.sourceRules };
  for (const { id } of CHANNELS) {
    if (!sourceRules[id]) sourceRules[id] = emptyRule();
    else {
      sourceRules[id] = {
        useDedicatedPool: !!sourceRules[id]?.useDedicatedPool,
        poolUserIds: Array.isArray(sourceRules[id]?.poolUserIds) ? [...sourceRules[id]!.poolUserIds] : [],
      };
    }
  }
  return { ...cfg, sourceRules };
}

export default function CrmLeadRoutingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [config, setConfig] = useState<RoutingConfig>(() =>
    ensureRules({
      enabled: false,
      strategy: 'none',
      poolUserIds: [],
      roundRobinCursors: {},
      sourceRules: {},
    })
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        fetchWithAuth('/api/settings/crm-lead-routing', {}),
        fetchWithAuth('/api/sellers', {}),
      ]);
      if (rRes.ok) {
        const data = await rRes.json();
        if (data.config) setConfig(ensureRules(data.config as RoutingConfig));
      }
      if (sRes.ok) {
        const data = await sRes.json();
        const list = (data.sellers || []) as SellerRow[];
        setSellers(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function toggleGlobalPool(id: string) {
    setConfig((prev) => {
      const set = new Set(prev.poolUserIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return ensureRules({ ...prev, poolUserIds: [...set].sort() });
    });
  }

  function toggleSourceDedicated(source: LeadSource, on: boolean) {
    setConfig((prev) => {
      const next = { ...prev.sourceRules };
      const cur = { ...(next[source] || emptyRule()), useDedicatedPool: on };
      if (!on) cur.poolUserIds = [];
      next[source] = cur;
      return ensureRules({ ...prev, sourceRules: next });
    });
  }

  function toggleSourcePool(source: LeadSource, sellerId: string) {
    setConfig((prev) => {
      const next = { ...prev.sourceRules };
      const base = { ...(next[source] || emptyRule()) };
      const set = new Set(base.poolUserIds);
      if (set.has(sellerId)) set.delete(sellerId);
      else set.add(sellerId);
      base.poolUserIds = [...set].sort();
      base.useDedicatedPool = true;
      next[source] = base;
      return ensureRules({ ...prev, sourceRules: next });
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchWithAuth('/api/settings/crm-lead-routing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: config.enabled,
          strategy: config.enabled ? 'round_robin' : 'none',
          poolUserIds: config.poolUserIds,
          sourceRules: config.sourceRules,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(ensureRules(data.config as RoutingConfig));
        alert('Reglas guardadas correctamente');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(typeof err?.error === 'string' ? err.error : 'No se pudo guardar');
      }
    } catch (err) {
      console.error(err);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-600">Cargando reglas de CRM…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CRM — Reglas de asignación de leads</h1>
        <p className="mt-1 text-sm text-gray-600">
          Define <strong>round-robin</strong> global y, si lo necesitas, <strong>pools distintos por canal</strong>{' '}
          (web, Meta, WhatsApp, etc.). Los leads que ya vienen con vendedor asignado no se modifican. La lógica se
          aplica al crear el lead en el servidor (Firestore + API).
        </p>
        <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Tras cambiar reglas en producción, despliega también las{' '}
          <strong>reglas de seguridad de Firestore</strong> actualizadas (colección{' '}
          <code className="text-xs">tenants/…/settings</code>) para que el personal autorizado pueda leer/escribir
          ajustes desde el cliente si lo usas en el futuro.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Asignación automática</h2>
          <label className="mt-4 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig(ensureRules({ ...config, enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="font-medium text-gray-800">Activar round-robin para leads sin vendedor</span>
          </label>
        </section>

        {config.enabled && (
          <>
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Pool global (opcional)</h2>
              <p className="mt-1 text-sm text-gray-600">
                Si no marcas a nadie, entran <strong>todos los vendedores activos</strong> del concesionario. Si
                marcas vendedores, solo ellos reciben leads por round-robin en canales que{' '}
                <strong>no tengan pool dedicado</strong>.
              </p>
              <div className="mt-4 max-h-52 space-y-2 overflow-y-auto rounded-lg border border-gray-100">
                {sellers.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">No hay vendedores. Revisa la sección Usuarios / Vendedores.</p>
                ) : (
                  sellers.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-gray-50 px-3 py-2 last:border-0 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={config.poolUserIds.includes(s.id)}
                        onChange={() => toggleGlobalPool(s.id)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-gray-800">
                        {s.name || s.id}
                        {s.email ? <span className="text-gray-500"> — {s.email}</span> : null}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Reglas por canal</h2>
              <p className="mt-1 text-sm text-gray-600">
                Activa &quot;Pool dedicado&quot; para elegir vendedores solo para ese canal. Cada canal lleva su propio
                contador round-robin.
              </p>
              <div className="mt-4 space-y-4">
                {CHANNELS.map(({ id, label }) => {
                  const rule = config.sourceRules[id] || emptyRule();
                  const cursor = config.roundRobinCursors[id];
                  return (
                    <div key={id} className="rounded-lg border border-gray-100 bg-gray-50/80 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900">{label}</p>
                          <p className="text-xs text-gray-500">
                            Cursor RR:{' '}
                            <strong>{typeof cursor === 'number' ? cursor : 0}</strong> (solo lectura; avanza al crear
                            leads)
                          </p>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={rule.useDedicatedPool}
                            onChange={(e) => toggleSourceDedicated(id, e.target.checked)}
                            className="h-4 w-4"
                          />
                          Pool dedicado
                        </label>
                      </div>
                      {rule.useDedicatedPool && (
                        <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-md border border-dashed border-gray-200 bg-white p-2">
                          {sellers.length === 0 ? (
                            <p className="text-xs text-gray-500">Sin vendedores para elegir.</p>
                          ) : (
                            sellers.map((s) => (
                              <label key={s.id} className="flex cursor-pointer items-center gap-2 px-1 py-1 text-sm">
                                <input
                                  type="checkbox"
                                  checked={rule.poolUserIds.includes(s.id)}
                                  onChange={() => toggleSourcePool(id, s.id)}
                                  className="h-4 w-4"
                                />
                                {s.name || s.id}
                              </label>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-6 py-2.5 font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar reglas'}
          </button>
          <Link
            href="/leads"
            className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-medium text-gray-800 hover:bg-gray-50"
          >
            Ir a Leads
          </Link>
          <Link href="/settings" className="rounded-lg px-6 py-2.5 font-medium text-primary-700 hover:underline">
            Volver al resumen
          </Link>
        </div>
      </form>
    </div>
  );
}
