'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';
import { RealtimeIndicator } from '@/components/RealtimeIndicator';

interface Subscription {
  id: string;
  tenantId: string;
  userId: string;
  membershipId: string;
  status: 'active' | 'past_due' | 'cancelled' | 'suspended' | 'trialing' | 'unpaid' | 'incomplete' | 'incomplete_expired';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  lastPaymentDate?: string;
  nextPaymentDate?: string;
  daysPastDue?: number;
  suspendedAt?: string;
  reactivatedAt?: string;
  tenantName?: string;
  userName?: string;
  membershipName?: string;
  amount?: number;
}

export default function SubscriptionsPage() {
  const [filter, setFilter] = useState<string>('all');
  const { subscriptions, stats, loading } = useRealtimeSubscriptions({
    status: filter !== 'all' ? filter : undefined,
  });

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      past_due: 'bg-yellow-100 text-yellow-700',
      suspended: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
      trialing: 'bg-blue-100 text-blue-700',
      unpaid: 'bg-orange-100 text-orange-700',
      incomplete: 'bg-purple-100 text-purple-700',
      incomplete_expired: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      active: 'Activa',
      past_due: 'Atrasada',
      suspended: 'Suspendida',
      cancelled: 'Cancelada',
      trialing: 'En Prueba',
      unpaid: 'Sin Pagar',
      incomplete: 'Incompleta',
      incomplete_expired: 'Incompleta Expirada',
    };
    return labels[status] || status;
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Suscripciones</h1>
            <p className="text-gray-600">
              Gestiona todas las suscripciones, estados de pago y facturación automática
            </p>
          </div>
          <RealtimeIndicator isActive={!loading} label="Tiempo real" />
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Activas</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Atrasadas</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pastDue}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Suspendidas</div>
          <div className="text-2xl font-bold text-red-600">{stats.suspended}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded ${
              filter === 'active'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Activas
          </button>
          <button
            onClick={() => setFilter('past_due')}
            className={`px-4 py-2 rounded ${
              filter === 'past_due'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Atrasadas
          </button>
          <button
            onClick={() => setFilter('suspended')}
            className={`px-4 py-2 rounded ${
              filter === 'suspended'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Suspendidas
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded ${
              filter === 'cancelled'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Canceladas
          </button>
        </div>
      </div>

      {/* Tabla de suscripciones */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant/Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Membresía
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Próximo Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Días Atraso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No hay suscripciones
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{sub.tenantName || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{sub.userName || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{sub.membershipName || 'N/A'}</div>
                      {sub.amount && (
                        <div className="text-sm text-gray-500">${sub.amount}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          sub.status
                        )}`}
                      >
                        {getStatusLabel(sub.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{new Date(sub.currentPeriodStart).toLocaleDateString('es-ES')}</div>
                      <div className="text-xs">hasta {new Date(sub.currentPeriodEnd).toLocaleDateString('es-ES')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sub.lastPaymentDate
                        ? new Date(sub.lastPaymentDate).toLocaleDateString('es-ES')
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sub.nextPaymentDate
                        ? (() => {
                            const nextDate = sub.nextPaymentDate instanceof Date 
                              ? sub.nextPaymentDate 
                              : new Date(sub.nextPaymentDate);
                            const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                            return (
                              <div>
                                <div>{nextDate.toLocaleDateString('es-ES')}</div>
                                {daysUntil > 0 && (
                                  <div className="text-xs text-blue-600">
                                    En {daysUntil} día{daysUntil !== 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sub.daysPastDue !== undefined && sub.daysPastDue > 0 ? (
                        <span className="text-red-600 font-medium">{sub.daysPastDue} días</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/admin/subscriptions/${sub.id}`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Ver detalles
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}




