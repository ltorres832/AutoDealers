'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

type TenantOption = {
  id: string;
  name: string;
  type: string;
  companyName?: string;
};

export function GrantCourtesyDaysForm({
  initialTenantId,
  initialTenantName,
  onSuccess,
}: {
  initialTenantId?: string;
  initialTenantName?: string;
  onSuccess?: () => void;
}) {
  const [tenantId, setTenantId] = useState(initialTenantId || '');
  const [tenantQuery, setTenantQuery] = useState(initialTenantName || '');
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (initialTenantId) setTenantId(initialTenantId);
    if (initialTenantName) setTenantQuery(initialTenantName);
  }, [initialTenantId, initialTenantName]);

  useEffect(() => {
    if (initialTenantId) return;
    let cancelled = false;
    async function load() {
      setSearching(true);
      try {
        const res = await fetchWithAuth('/api/admin/tenants');
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          const rows = (data.tenants || []) as TenantOption[];
          setTenants(rows.filter((t) => t.type === 'dealer' || t.type === 'seller'));
        }
      } catch {
        if (!cancelled) setTenants([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialTenantId]);

  const filtered = tenants.filter((t) => {
    const q = tenantQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.name?.toLowerCase().includes(q) ||
      t.companyName?.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q)
    );
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!tenantId) {
      setError('Selecciona un dealer o un vendedor.');
      setLoading(false);
      return;
    }
    if (!Number.isFinite(days) || days < 1) {
      setError('Indica un número de días mayor que 0.');
      setLoading(false);
      return;
    }

    if (
      !confirm(
        `¿Otorgar ${days} día${days === 1 ? '' : 's'} de cortesía? El acceso se extiende ahora en Firestore y, si hay Stripe, también se mueve la fecha de cobro/prueba.`
      )
    ) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetchWithAuth('/api/admin/courtesy-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, days }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudieron otorgar los días de cortesía.');
        return;
      }
      setSuccess(data.message || 'Días de cortesía otorgados.');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {success}
        </div>
      ) : null}

      <div className="rounded-lg border border-primary-100 bg-primary-50 p-3 text-sm text-primary-900">
        <p className="font-semibold">Qué hace esto</p>
        <p className="mt-1">
          Extiende el acceso del dealer o vendedor por N días (prueba o periodo). Se escribe en la
          suscripción del tenant (`currentPeriodEnd`, `trialEndsAt`, `courtesyDays`) para que el
          dashboard se actualice al momento. Si hay suscripción en Stripe, también se mueve
          `trial_end`.
        </p>
      </div>

      {!initialTenantId ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dealer o vendedor</label>
          <input
            type="search"
            value={tenantQuery}
            onChange={(e) => setTenantQuery(e.target.value)}
            placeholder="Busca por nombre o ID"
            className="w-full border rounded-lg px-3 py-2 mb-2"
          />
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">{searching ? 'Cargando…' : 'Selecciona un tenant'}</option>
            {filtered.slice(0, 200).map((t) => (
              <option key={t.id} value={t.id}>
                {t.type === 'dealer' ? 'Dealer' : 'Vendedor'} — {t.companyName || t.name} ({t.id.slice(0, 8)}…)
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm text-gray-700">
          Tenant: <strong>{initialTenantName || tenantId}</strong>
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Número de días</label>
        <input
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value, 10) || 0)}
          className="w-full border rounded-lg px-3 py-2"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Otorgando…' : `Confirmar ${days} día${days === 1 ? '' : 's'} de cortesía`}
      </button>
    </form>
  );
}
