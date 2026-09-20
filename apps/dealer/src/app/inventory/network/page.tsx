'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

type NetworkVehicle = {
  id: string;
  tenantId: string;
  dealerName: string;
  make?: string;
  model?: string;
  year?: number;
  price?: number;
  status?: string;
  vin?: string;
  stockNumber?: string;
  quantity?: number;
  photos?: string[];
  publishedOnPublicPage?: boolean;
};

type Dealer = { id: string; name: string };

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  available: { label: 'Disponible', cls: 'bg-green-100 text-green-800' },
  reserved: { label: 'Reservado', cls: 'bg-amber-100 text-amber-800' },
  sold: { label: 'Vendido', cls: 'bg-red-100 text-red-800' },
  hidden: { label: 'Oculto', cls: 'bg-gray-200 text-gray-700' },
};

export default function NetworkInventoryPage() {
  const [vehicles, setVehicles] = useState<NetworkVehicle[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dealerFilter, setDealerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set()); // `${tenantId}:${id}`
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [netRes, allyRes] = await Promise.all([
        fetchWithAuth('/api/vehicles/network-inventory', {}),
        fetchWithAuth('/api/inventory-alliances?vehicles=1', {}),
      ]);
      const data = await netRes.json();
      if (!netRes.ok) throw new Error(data.error || 'Error cargando inventario');
      setDealers(data.dealers || []);
      const own = Array.isArray(data.vehicles) ? data.vehicles : [];
      let allied: typeof own = [];
      if (allyRes.ok) {
        const ally = await allyRes.json();
        allied = (ally.alliedVehicles || []).map((v: Record<string, unknown>) => ({
          id: String(v.id),
          tenantId: String(v.alliedFromTenantId || v.tenantId || ''),
          dealerName: `Alianza: ${v.alliedFromName || 'Dealer'}`,
          make: v.make as string | undefined,
          model: v.model as string | undefined,
          year: v.year as number | undefined,
          price: v.price as number | undefined,
          status: v.status as string | undefined,
          vin: v.vin as string | undefined,
          stockNumber: v.stockNumber as string | undefined,
          photos: v.photos as string[] | undefined,
          publishedOnPublicPage: v.publishedOnPublicPage as boolean | undefined,
        }));
      }
      setVehicles([...own, ...allied]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (dealerFilter !== 'all' && v.tenantId !== dealerFilter) return false;
      if (statusFilter !== 'all' && String(v.status || '') !== statusFilter) return false;
      if (q) {
        const hay = [v.make, v.model, v.vin, v.stockNumber, String(v.year || '')]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [vehicles, dealerFilter, statusFilter, search]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const runBulk = async (action: Record<string, unknown>, confirmText?: string) => {
    if (selected.size === 0) return;
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setMessage('');
    try {
      // Agrupar selección por dealer y ejecutar por tenant
      const byTenant = new Map<string, string[]>();
      for (const key of selected) {
        const [tenantId, id] = key.split(':');
        if (!byTenant.has(tenantId)) byTenant.set(tenantId, []);
        byTenant.get(tenantId)!.push(id);
      }
      for (const [tenantId, vehicleIds] of byTenant) {
        const res = await fetchWithAuth('/api/vehicles/bulk-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, vehicleIds, action }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Error en dealer ${tenantId}`);
      }
      setMessage('Acción aplicada correctamente');
      setSelected(new Set());
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error aplicando la acción');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inventario multi-dealer + alianzas</h1>
          <p className="text-gray-500 mt-1">
            Sedes propias y unidades compartidas por alianzas (solo lectura del aliado).
          </p>
        </div>
        <Link
          href="/inventory"
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          ← Volver al inventario
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={dealerFilter}
          onChange={(e) => setDealerFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">Todas las sedes</option>
          {dealers.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">Todos los estados</option>
          <option value="available">Disponibles</option>
          <option value="reserved">Reservados</option>
          <option value="sold">Vendidos</option>
          <option value="hidden">Ocultos</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por marca, modelo, VIN o stock…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[220px]"
        />
        <button
          onClick={() => setSelected(new Set(filtered.map((v) => `${v.tenantId}:${v.id}`)))}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
        >
          Seleccionar todos ({filtered.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 w-10" />
                <th className="px-3 py-3 text-left font-medium text-gray-600">Vehículo</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">Sede</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">VIN / Stock</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">Precio</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">Cant.</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-gray-500">
                    No hay vehículos con estos filtros
                  </td>
                </tr>
              ) : (
                filtered.map((v) => {
                  const key = `${v.tenantId}:${v.id}`;
                  const status = STATUS_LABELS[String(v.status || '')] || {
                    label: String(v.status || '—'),
                    cls: 'bg-gray-100 text-gray-600',
                  };
                  return (
                    <tr
                      key={key}
                      className={`hover:bg-gray-50 cursor-pointer ${selected.has(key) ? 'bg-primary-50' : ''}`}
                      onClick={() => toggle(key)}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-primary-600"
                          checked={selected.has(key)}
                          onChange={() => toggle(key)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          {v.photos?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={v.photos[0]}
                              alt=""
                              className="w-12 h-9 object-cover rounded-md border border-gray-200"
                            />
                          ) : (
                            <div className="w-12 h-9 rounded-md bg-gray-100 flex items-center justify-center text-gray-400">🚗</div>
                          )}
                          <span className="font-medium text-gray-900">
                            {[v.year, v.make, v.model].filter(Boolean).join(' ') || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{v.dealerName}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-500">
                        {v.vin || v.stockNumber || '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        {v.price != null ? `$${Number(v.price).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-3 py-2.5">{v.quantity ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected.size > 0 && (
        <div className="sticky bottom-4 z-40 mt-6">
          <div className="bg-slate-900 text-white rounded-xl shadow-2xl px-5 py-4 flex flex-wrap items-center gap-3">
            <span className="font-semibold">{selected.size} seleccionados</span>
            <button onClick={() => setSelected(new Set())} className="text-slate-300 hover:text-white text-sm underline">
              Limpiar
            </button>
            <span className="w-px h-6 bg-slate-700 mx-1" />
            <button
              disabled={busy}
              onClick={() => void runBulk({ type: 'sold' }, `¿Marcar ${selected.size} vehículos como vendidos?`)}
              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-sm font-medium disabled:opacity-50"
            >
              Vendido
            </button>
            <button
              disabled={busy}
              onClick={() => void runBulk({ type: 'hide' })}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium disabled:opacity-50"
            >
              Ocultar
            </button>
            <button
              disabled={busy}
              onClick={() => void runBulk({ type: 'reactivate' })}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium disabled:opacity-50"
            >
              Reactivar
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void runBulk({ type: 'delete' }, `¿Eliminar ${selected.size} vehículos del inventario?`)
              }
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium disabled:opacity-50"
            >
              Eliminar
            </button>
            {busy && <span className="text-sm text-slate-300">Aplicando…</span>}
            {message && !busy && <span className="text-sm text-slate-300">{message}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
