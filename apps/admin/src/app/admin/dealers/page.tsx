'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRealtimeDealers, type DealerTenant, type DealerStatus } from '@/hooks/useRealtimeDealers';
import { useRealtimeMemberships } from '@/hooks/useRealtimeMemberships';
import { AdminDeleteButton } from '@/components/AdminDeleteButton';
import { AdminSupportEnterButton } from '@/components/AdminSupportEnterButton';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { formatTenantHostname } from '@autodealers/shared/platform-urls';

type StatusFilter = 'all' | 'active' | 'suspended' | 'cancelled' | 'pending';

const STATUS_LABEL: Record<DealerStatus, string> = {
  active: 'Activo',
  suspended: 'Suspendido',
  cancelled: 'Cancelado',
  pending: 'Pendiente',
};

function statusBadge(status: DealerStatus) {
  const cls =
    status === 'active'
      ? 'bg-green-100 text-green-800'
      : status === 'suspended'
        ? 'bg-amber-100 text-amber-800'
        : status === 'cancelled'
          ? 'bg-gray-100 text-gray-700'
          : 'bg-yellow-100 text-yellow-800';

  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{STATUS_LABEL[status]}</span>;
}

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'suspended', label: 'Suspendidos' },
  { key: 'cancelled', label: 'Cancelados' },
  { key: 'pending', label: 'Pendientes' },
];

export default function DealersManagementPage() {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const { dealers, loading } = useRealtimeDealers();
  const { memberships } = useRealtimeMemberships();

  const membershipNameById = useMemo(() => {
    const map: Record<string, string> = {};
    memberships.forEach((m) => {
      map[m.id] = m.name;
    });
    return map;
  }, [memberships]);

  const visibleDealers = useMemo(() => {
    if (filter === 'all') {
      // Ocultamos los cancelados en la vista general (igual que antes)
      return dealers.filter((d) => d.status !== 'cancelled');
    }
    return dealers.filter((d) => d.status === filter);
  }, [dealers, filter]);

  function membershipLabel(dealer: DealerTenant) {
    if (!dealer.membershipId) return 'Sin membresía';
    return membershipNameById[dealer.membershipId] || 'Membresía asignada';
  }

  async function runDealerAction(dealer: DealerTenant, action: 'suspend' | 'reactivate') {
    const labels = {
      suspend: `¿Suspender a ${dealer.name}? No podrá iniciar sesión.`,
      reactivate: `¿Reactivar a ${dealer.name}?`,
    };

    if (!confirm(labels[action])) return;

    setActionId(dealer.dealerId);
    setMessage(null);

    try {
      const nextStatus = action === 'suspend' ? 'suspended' : 'active';
      let res: Response;

      if (dealer.ownerUid) {
        // Actualiza el usuario titular (deshabilita/rehabilita el login) y en
        // cascada el estado del tenant y del dealer.
        res = await fetchWithAuth(`/api/admin/users/${dealer.ownerUid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: nextStatus,
            authDisabled: action === 'suspend',
          }),
        });
      } else {
        // Dealer sin usuario titular asociado: solo actualizamos el tenant.
        res = await fetchWithAuth(`/api/admin/tenants/${dealer.dealerId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({ type: 'err', text: data.error || 'No se pudo actualizar el dealer' });
        return;
      }

      setMessage({
        type: 'ok',
        text:
          action === 'suspend'
            ? `Dealer ${dealer.name} suspendido.`
            : `Dealer ${dealer.name} reactivado.`,
      });
    } catch (error) {
      console.error('Error updating dealer status:', error);
      setMessage({ type: 'err', text: 'Error de red' });
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Gestión de Dealers</h1>
        <p className="text-gray-600">
          Suspende, reactiva, da de baja o elimina definitivamente cuentas dealer. Cada dealer es un
          tenant de tipo dealer.
        </p>
      </div>

      {message ? (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="mb-6 filter-chip-row">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-lg px-4 py-2 ${
              filter === key ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando dealers...</p>
        </div>
      ) : visibleDealers.length === 0 ? (
        <div className="rounded-lg bg-gray-50 py-12 text-center">
          <p className="text-gray-600">No hay dealers con este filtro</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="table-scroll">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Dealer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Membresía
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Registrado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {visibleDealers.map((dealer) => (
                  <tr key={dealer.dealerId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {dealer.companyName && dealer.companyName !== dealer.name ? (
                        <div className="text-xs font-semibold text-primary-600">{dealer.companyName}</div>
                      ) : null}
                      <div className="text-sm font-medium text-gray-900">{dealer.name}</div>
                      <div className="text-sm text-gray-500">
                        {dealer.subdomain ? formatTenantHostname(dealer.subdomain) : dealer.dealerId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{membershipLabel(dealer)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {dealer.createdAt.toLocaleDateString('es')}
                      </div>
                    </td>
                    <td className="px-6 py-4">{statusBadge(dealer.status)}</td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex min-w-[170px] flex-col gap-1">
                        <Link
                          href={`/admin/tenants/${dealer.dealerId}`}
                          className="text-left text-xs font-medium text-primary-600 hover:underline"
                        >
                          Ver tenant
                        </Link>
                        <AdminSupportEnterButton
                          tenantId={dealer.dealerId}
                          userId={dealer.ownerUid || undefined}
                          label="Entrar al panel"
                          className="text-left text-xs font-medium text-amber-700 hover:underline disabled:opacity-50 bg-transparent p-0"
                        />
                        <Link
                          href={`/admin/courtesy-days?tenantId=${encodeURIComponent(dealer.dealerId)}&name=${encodeURIComponent(dealer.name)}`}
                          className="text-left text-xs font-medium text-green-700 hover:underline"
                        >
                          Días de cortesía
                        </Link>
                        {dealer.ownerUid ? (
                          <Link
                            href={`/admin/users/${dealer.ownerUid}/edit`}
                            className="text-left text-xs font-medium text-primary-700 hover:underline"
                          >
                            Editar cuenta
                          </Link>
                        ) : null}
                        {dealer.status === 'active' ? (
                          <button
                            type="button"
                            disabled={actionId === dealer.dealerId}
                            onClick={() => void runDealerAction(dealer, 'suspend')}
                            className="text-left text-xs text-amber-700 hover:underline disabled:opacity-50"
                          >
                            Suspender
                          </button>
                        ) : null}
                        {(dealer.status === 'suspended' || dealer.status === 'cancelled') ? (
                          <button
                            type="button"
                            disabled={actionId === dealer.dealerId}
                            onClick={() => void runDealerAction(dealer, 'reactivate')}
                            className="text-left text-xs text-green-700 hover:underline disabled:opacity-50"
                          >
                            Reactivar
                          </button>
                        ) : null}
                        {dealer.ownerUid && dealer.status !== 'cancelled' ? (
                          <AdminDeleteButton
                            deleteUrl={`/api/admin/users/${dealer.ownerUid}`}
                            label="Dar de baja"
                            confirmMessage={`¿Dar de baja al dealer ${dealer.name}? Se deshabilitará el acceso y desaparecerá de esta lista.`}
                            successMessage={false}
                            permanent={false}
                            onDeleted={() => {
                              setMessage({
                                type: 'ok',
                                text: `Dealer ${dealer.name} dado de baja.`,
                              });
                            }}
                            onError={(text) => setMessage({ type: 'err', text })}
                            className="text-left text-xs text-red-700 hover:underline"
                          />
                        ) : null}
                        {dealer.ownerUid ? (
                          <AdminDeleteButton
                            deleteUrl={`/api/admin/users/${dealer.ownerUid}`}
                            label="Eliminar definitivamente"
                            confirmMessage={`¿Eliminar permanentemente la cuenta de ${dealer.name}? Se borrarán usuario, tenant y acceso.`}
                            successMessage={false}
                            onDeleted={() => {
                              setMessage({
                                type: 'ok',
                                text: `Cuenta de ${dealer.name} eliminada permanentemente.`,
                              });
                            }}
                            onError={(text) => setMessage({ type: 'err', text })}
                            className="text-left text-xs text-red-800 hover:underline"
                          />
                        ) : (
                          <AdminDeleteButton
                            deleteUrl={`/api/admin/tenants/${dealer.dealerId}`}
                            label="Eliminar tenant"
                            confirmMessage={`¿Eliminar permanentemente el tenant ${dealer.name}? Se borrará el dealer y su inventario.`}
                            successMessage={false}
                            permanent={false}
                            onDeleted={() => {
                              setMessage({
                                type: 'ok',
                                text: `Tenant ${dealer.name} eliminado.`,
                              });
                            }}
                            onError={(text) => setMessage({ type: 'err', text })}
                            className="text-left text-xs text-red-800 hover:underline"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
