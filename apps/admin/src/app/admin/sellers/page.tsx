'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import StarRating from '@/components/StarRating';

type SellerRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  tenantId?: string;
  dealerId?: string | null;
  dealerName?: string | null;
  tenantName?: string | null;
  tenantType?: string | null;
  sellerRating?: number;
  sellerRatingCount?: number;
  lastLogin?: string;
  createdAt?: string;
  authDisabled?: boolean;
  phone?: string;
};

type DealerOption = { id: string; name: string };

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  suspended: 'Suspendido',
  cancelled: 'Cancelado',
  inactive: 'Inactivo',
};

function statusBadge(status: string, authDisabled?: boolean) {
  if (authDisabled) {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
        Auth deshabilitado
      </span>
    );
  }
  const s = status || 'active';
  const cls =
    s === 'active'
      ? 'bg-green-100 text-green-800'
      : s === 'suspended'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {STATUS_LABEL[s] || s}
    </span>
  );
}

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    dealerId: '',
    linkType: 'all' as 'all' | 'independent' | 'linked',
  });

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.dealerId) params.set('dealerId', filters.dealerId);
      if (filters.linkType !== 'all') params.set('linkType', filters.linkType);

      const res = await fetch(`/api/admin/sellers?${params}`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'err', text: data.error || 'No se pudo cargar' });
        setSellers([]);
        return;
      }
      setSellers(data.sellers || []);
    } catch {
      setMessage({ type: 'err', text: 'Error de red' });
      setSellers([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchSellers();
  }, [fetchSellers]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/dealers/list', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        const list = data.dealers || data.data?.dealers || [];
        setDealers(Array.isArray(list) ? list : []);
      } catch {
        setDealers([]);
      }
    })();
  }, []);

  async function runAction(
    sellerId: string,
    action: 'suspend' | 'reactivate' | 'cancel'
  ) {
    const labels = {
      suspend: '¿Suspender este vendedor? No podrá iniciar sesión.',
      reactivate: '¿Reactivar este vendedor?',
      cancel: '¿Dar de baja este vendedor? Se deshabilitará el acceso.',
    };
    if (!confirm(labels[action])) return;

    setActionId(sellerId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'err', text: data.error || 'Acción fallida' });
        return;
      }
      setMessage({ type: 'ok', text: 'Actualizado correctamente' });
      await fetchSellers();
    } catch {
      setMessage({ type: 'err', text: 'Error de red' });
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Vendedores</h1>
          <p className="text-gray-600 mt-2 max-w-3xl text-sm leading-relaxed">
            Control de soporte sobre todos los vendedores: cambiar email y contraseña, suspender acceso,
            vincular a concesionario o revisar tenant independiente. La edición completa (email de inicio de
            sesión, Firebase Auth, permisos) está en{' '}
            <strong>Editar cuenta</strong>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href="/admin/users?role=seller"
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
          >
            Ver en Usuarios
          </Link>
          <Link
            href="/admin/users"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 font-medium"
          >
            + Crear vendedor
          </Link>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <input
            type="search"
            placeholder="Buscar nombre, email, ID…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm lg:col-span-2"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="suspended">Suspendido</option>
            <option value="cancelled">Cancelado</option>
            <option value="inactive">Inactivo</option>
          </select>
          <select
            value={filters.linkType}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                linkType: e.target.value as 'all' | 'independent' | 'linked',
              }))
            }
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">Todos los tipos</option>
            <option value="linked">Bajo concesionario</option>
            <option value="independent">Independiente</option>
          </select>
          <select
            value={filters.dealerId}
            onChange={(e) => setFilters((f) => ({ ...f, dealerId: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todos los dealers</option>
            {dealers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      ) : sellers.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No hay vendedores con estos filtros.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Concesionario</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Valoración</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sellers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/80 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{s.name || '—'}</div>
                    <div className="text-gray-600">{s.email}</div>
                    {s.phone ? <div className="text-xs text-gray-500">{s.phone}</div> : null}
                    <div className="font-mono text-[10px] text-gray-400 mt-1 break-all">{s.id}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {s.dealerId ? (
                      <span className="text-blue-800">Bajo dealer</span>
                    ) : (
                      <span className="text-purple-800">Independiente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.dealerId ? (
                      <Link
                        href={`/admin/tenants/${s.dealerId}`}
                        className="text-primary-600 hover:underline"
                      >
                        {s.dealerName || s.dealerId}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.tenantId ? (
                      <Link
                        href={`/admin/tenants/${s.tenantId}`}
                        className="text-primary-600 hover:underline"
                      >
                        {s.tenantName || s.tenantId}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">{statusBadge(s.status, s.authDisabled)}</td>
                  <td className="px-4 py-3">
                    <StarRating
                      rating={s.sellerRating ?? 0}
                      count={s.sellerRatingCount ?? 0}
                      size="sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 min-w-[140px]">
                      <Link
                        href={`/admin/users/${s.id}/edit`}
                        className="text-primary-600 hover:underline text-xs font-medium"
                      >
                        Editar cuenta (email, auth)
                      </Link>
                      {s.status === 'active' && !s.authDisabled ? (
                        <button
                          type="button"
                          disabled={actionId === s.id}
                          onClick={() => void runAction(s.id, 'suspend')}
                          className="text-left text-xs text-amber-700 hover:underline disabled:opacity-50"
                        >
                          Suspender
                        </button>
                      ) : null}
                      {(s.status === 'suspended' || s.authDisabled) && s.status !== 'cancelled' ? (
                        <button
                          type="button"
                          disabled={actionId === s.id}
                          onClick={() => void runAction(s.id, 'reactivate')}
                          className="text-left text-xs text-green-700 hover:underline disabled:opacity-50"
                        >
                          Reactivar
                        </button>
                      ) : null}
                      {s.status !== 'cancelled' ? (
                        <button
                          type="button"
                          disabled={actionId === s.id}
                          onClick={() => void runAction(s.id, 'cancel')}
                          className="text-left text-xs text-red-700 hover:underline disabled:opacity-50"
                        >
                          Dar de baja
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4">
        {sellers.length} vendedor(es) listados. Para cambiar el email de inicio de sesión, abre{' '}
        <strong>Editar cuenta</strong> y guarda; se actualiza Firebase Auth y Firestore.
      </p>
    </div>
  );
}
