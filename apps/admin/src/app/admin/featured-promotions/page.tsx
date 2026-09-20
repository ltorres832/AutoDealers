'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

type TargetType = 'vehicle' | 'seller' | 'dealer';
type Kind = 'featured' | 'boost_24h';

type Plan = {
  id: string;
  label: string;
  targetType: TargetType;
  kind: Kind;
  durationHours: number;
  price: number;
  currency: 'usd';
  active: boolean;
  sortOrder: number;
};

type Config = {
  enabled: boolean;
  maxFeaturedVehicles: number;
  maxFeaturedSellers: number;
  maxFeaturedDealers: number;
  maxBoostedVehicles: number;
  badgeFeatured: string;
  badgeBoost: string;
  plans: Plan[];
};

type Promotion = {
  id: string;
  targetType: string;
  targetId: string;
  tenantId: string;
  kind: string;
  planId?: string;
  planLabel?: string;
  status?: string;
  price: number;
  startsAt?: string;
  expiresAt?: string;
  createdAt?: string;
};

type PendingRequest = {
  id: string;
  tenantId: string;
  targetType: string;
  targetId: string;
  planId: string;
  planLabel?: string;
  kind: string;
  price: number;
  currency: string;
  status: string;
  createdAt?: string;
};

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  pending_payment: 'bg-amber-100 text-amber-800',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  expired: 'Expirado',
  cancelled: 'Cancelado',
  pending_payment: 'Pago pendiente',
};

function StatusBadge({ status }: { status?: string }) {
  const key = status || 'expired';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[key] || 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABEL[key] || key}
    </span>
  );
}

function kindLabel(kind?: string) {
  return kind === 'boost_24h' ? 'Boost' : 'Destacado';
}

function fmtDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export default function FeaturedPromotionsAdminPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [active, setActive] = useState<Promotion[]>([]);
  const [history, setHistory] = useState<Promotion[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/admin/featured-promotions');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || data.message || 'No se pudo cargar la configuración de destacados.');
        return;
      }
      setConfig(data.config);
      setActive(data.active || []);
      setHistory(data.history || []);
      setPending(data.pending || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando destacados.');
    } finally {
      setLoading(false);
    }
  }

  function updatePlan(index: number, patch: Partial<Plan>) {
    if (!config) return;
    const plans = [...config.plans];
    plans[index] = { ...plans[index], ...patch };
    setConfig({ ...config, plans });
  }

  function addPlan() {
    if (!config) return;
    const maxSort = config.plans.reduce((m, p) => Math.max(m, p.sortOrder || 0), 0);
    const newPlan: Plan = {
      id: `plan_${Date.now()}`,
      label: 'Nuevo plan',
      targetType: 'vehicle',
      kind: 'featured',
      durationHours: 72,
      price: 9.99,
      currency: 'usd',
      active: true,
      sortOrder: maxSort + 1,
    };
    setConfig({ ...config, plans: [...config.plans, newPlan] });
  }

  function removePlan(index: number) {
    if (!config) return;
    const plans = config.plans.filter((_, i) => i !== index);
    setConfig({ ...config, plans });
  }

  async function save() {
    if (!config) return;
    // Validación mínima: ids únicos y no vacíos.
    const ids = config.plans.map((p) => p.id.trim());
    if (ids.some((id) => !id)) {
      setMessage('Cada plan necesita un ID.');
      return;
    }
    if (new Set(ids).size !== ids.length) {
      setMessage('Hay IDs de plan duplicados.');
      return;
    }
    setSaving(true);
    setMessage('');
    const res = await fetchWithAuth('/api/admin/featured-promotions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
    setSaving(false);
    setMessage(res.ok ? 'Configuración guardada' : 'No se pudo guardar');
    if (res.ok) void load();
  }

  async function cancelPromotion(id: string) {
    if (!confirm('¿Cancelar esta promoción? Dejará de aparecer destacada.')) return;
    const res = await fetchWithAuth('/api/admin/featured-promotions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'cancelled' }),
    });
    if (res.ok) void load();
    else setMessage('No se pudo cancelar la promoción.');
  }

  const counts = useMemo(() => {
    const c = { active: 0, expired: 0, cancelled: 0, pending: pending.length };
    for (const h of history) {
      if (h.status === 'active') c.active += 1;
      else if (h.status === 'cancelled') c.cancelled += 1;
      else c.expired += 1;
    }
    return c;
  }, [history, pending]);

  if (loading) {
    return <div className="p-8">Cargando destacados...</div>;
  }

  if (error || !config) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="text-xl font-bold">No se pudo abrir Destacados / Boost</h1>
          <p className="mt-2">{error || 'La API no devolvió configuración.'}</p>
          <button
            onClick={() => void load()}
            className="mt-4 rounded bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Destacados y Boost</h1>
          <p className="mt-2 text-gray-600">
            Configura precios y planes, y administra las promociones activas, en cola e historial.
          </p>
        </div>
        <button
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg bg-primary-600 px-5 py-2 font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {message ? <div className="rounded-lg bg-blue-50 p-4 text-blue-800">{message}</div> : null}

      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Activos ahora</p>
          <p className="text-2xl font-bold text-green-700">{active.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">En cola (pago pendiente)</p>
          <p className="text-2xl font-bold text-amber-700">{counts.pending}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Expirados</p>
          <p className="text-2xl font-bold text-gray-700">{counts.expired}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Cancelados</p>
          <p className="text-2xl font-bold text-red-700">{counts.cancelled}</p>
        </div>
      </div>

      {/* Configuración general */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold">Configuración general</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            />
            Sistema activo
          </label>
          <label className="text-sm text-gray-600">
            Badge destacado
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={config.badgeFeatured}
              onChange={(e) => setConfig({ ...config, badgeFeatured: e.target.value })}
              placeholder="Badge destacado"
            />
          </label>
          <label className="text-sm text-gray-600">
            Badge boost
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={config.badgeBoost}
              onChange={(e) => setConfig({ ...config, badgeBoost: e.target.value })}
              placeholder="Badge boost"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="text-sm text-gray-600">
            Máx. autos destacados
            <input
              type="number"
              className="mt-1 w-full rounded border px-3 py-2"
              value={config.maxFeaturedVehicles}
              onChange={(e) => setConfig({ ...config, maxFeaturedVehicles: Number(e.target.value) })}
            />
          </label>
          <label className="text-sm text-gray-600">
            Máx. autos con boost
            <input
              type="number"
              className="mt-1 w-full rounded border px-3 py-2"
              value={config.maxBoostedVehicles}
              onChange={(e) => setConfig({ ...config, maxBoostedVehicles: Number(e.target.value) })}
            />
          </label>
          <label className="text-sm text-gray-600">
            Máx. vendedores destacados
            <input
              type="number"
              className="mt-1 w-full rounded border px-3 py-2"
              value={config.maxFeaturedSellers}
              onChange={(e) => setConfig({ ...config, maxFeaturedSellers: Number(e.target.value) })}
            />
          </label>
          <label className="text-sm text-gray-600">
            Máx. dealers destacados
            <input
              type="number"
              className="mt-1 w-full rounded border px-3 py-2"
              value={config.maxFeaturedDealers}
              onChange={(e) => setConfig({ ...config, maxFeaturedDealers: Number(e.target.value) })}
            />
          </label>
        </div>
      </section>

      {/* Planes y precios */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Planes y precios</h2>
          <button
            onClick={addPlan}
            className="rounded-lg border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            + Agregar plan
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Activo</th>
                <th className="p-3">Etiqueta</th>
                <th className="p-3">Producto</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Horas</th>
                <th className="p-3">Precio USD</th>
                <th className="p-3">ID</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {config.plans.map((plan, index) => (
                <tr key={index} className="border-t align-top">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={plan.active}
                      onChange={(e) => updatePlan(index, { active: e.target.checked })}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      className="w-56 rounded border px-2 py-1"
                      value={plan.label}
                      onChange={(e) => updatePlan(index, { label: e.target.value })}
                    />
                  </td>
                  <td className="p-3">
                    <select
                      className="rounded border px-2 py-1"
                      value={plan.targetType}
                      onChange={(e) => updatePlan(index, { targetType: e.target.value as TargetType })}
                    >
                      <option value="vehicle">Auto</option>
                      <option value="seller">Vendedor</option>
                      <option value="dealer">Dealer</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      className="rounded border px-2 py-1"
                      value={plan.kind}
                      onChange={(e) => updatePlan(index, { kind: e.target.value as Kind })}
                    >
                      <option value="featured">Destacado</option>
                      <option value="boost_24h">Boost</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      className="w-24 rounded border px-2 py-1"
                      value={plan.durationHours}
                      onChange={(e) => updatePlan(index, { durationHours: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      step="0.01"
                      className="w-28 rounded border px-2 py-1"
                      value={plan.price}
                      onChange={(e) => updatePlan(index, { price: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      className="w-40 rounded border px-2 py-1 font-mono text-xs"
                      value={plan.id}
                      onChange={(e) => updatePlan(index, { id: e.target.value })}
                    />
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => removePlan(index)}
                      className="rounded border border-red-200 px-3 py-1 text-red-700 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {config.plans.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={8}>
                    No hay planes. Agrega el primero.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Recuerda pulsar &quot;Guardar cambios&quot; para aplicar precios y planes.
        </p>
      </section>

      {/* Activos ahora */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold">Activos ahora ({active.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Tipo</th>
                <th className="p-3">Target</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Precio</th>
                <th className="p-3">Expira</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {active.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{kindLabel(p.kind)}</td>
                  <td className="p-3">
                    <span className="capitalize">{p.targetType}</span>: <span className="font-mono text-xs">{p.targetId}</span>
                  </td>
                  <td className="p-3">{p.planLabel || p.planId}</td>
                  <td className="p-3">${p.price}</td>
                  <td className="p-3">{fmtDate(p.expiresAt)}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => void cancelPromotion(p.id)}
                      className="rounded border border-red-200 px-3 py-1 text-red-700 hover:bg-red-50"
                    >
                      Cancelar
                    </button>
                  </td>
                </tr>
              ))}
              {active.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={6}>
                    No hay destacados activos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* En cola / pago pendiente */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold">En cola — pago pendiente ({pending.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Tipo</th>
                <th className="p-3">Target</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Precio</th>
                <th className="p-3">Tenant</th>
                <th className="p-3">Solicitado</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((p) => (
                <tr key={`${p.tenantId}_${p.id}`} className="border-t">
                  <td className="p-3">{kindLabel(p.kind)}</td>
                  <td className="p-3">
                    <span className="capitalize">{p.targetType}</span>: <span className="font-mono text-xs">{p.targetId}</span>
                  </td>
                  <td className="p-3">{p.planLabel || p.planId}</td>
                  <td className="p-3">${p.price}</td>
                  <td className="p-3 font-mono text-xs">{p.tenantId}</td>
                  <td className="p-3">{fmtDate(p.createdAt)}</td>
                </tr>
              ))}
              {pending.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={6}>
                    No hay solicitudes en cola.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Historial completo */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold">Historial / Registro ({history.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Estado</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Target</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Precio</th>
                <th className="p-3">Inicio</th>
                <th className="p-3">Fin</th>
              </tr>
            </thead>
            <tbody>
              {history.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3"><StatusBadge status={p.status} /></td>
                  <td className="p-3">{kindLabel(p.kind)}</td>
                  <td className="p-3">
                    <span className="capitalize">{p.targetType}</span>: <span className="font-mono text-xs">{p.targetId}</span>
                  </td>
                  <td className="p-3">{p.planLabel || p.planId}</td>
                  <td className="p-3">${p.price}</td>
                  <td className="p-3">{fmtDate(p.startsAt)}</td>
                  <td className="p-3">{fmtDate(p.expiresAt)}</td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={7}>
                    Aún no hay registro de promociones.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
