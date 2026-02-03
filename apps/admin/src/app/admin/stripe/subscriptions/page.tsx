'use client';

import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';

interface Subscription {
  id: string;
  status: string;
  customerEmail: string | null;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  items: { productName: string | null; amount: number; currency: string; interval: string }[];
  tenantInfo: { name: string } | null;
}

export default function StripeSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    fetchSubscriptions();
  }, [filter]);

  async function fetchSubscriptions() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/stripe/subscriptions?status=${filter}`);
      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function cancelSubscription(id: string, immediately: boolean) {
    if (!confirm(`¿Cancelar suscripción ${immediately ? 'inmediatamente' : 'al final del período'}?`)) return;

    try {
      const response = await fetch(`/api/admin/stripe/subscriptions/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediately }),
      });

      const data = await response.json();
      alert(data.message);
      fetchSubscriptions();
    } catch (error) {
      alert('Error al cancelar suscripción');
    }
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    canceled: 'bg-red-100 text-red-800',
    past_due: 'bg-yellow-100 text-yellow-800',
    trialing: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <BackButton href="/admin/stripe" label="Volver al Dashboard Stripe" />
      </div>
      <h1 className="text-3xl font-bold mb-6">Suscripciones de Stripe</h1>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2">
          {['active', 'canceled', 'past_due', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Cargando...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay suscripciones</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Próximo Pago</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{sub.tenantInfo?.name || 'Sin nombre'}</div>
                    <div className="text-sm text-gray-500">{sub.customerEmail}</div>
                  </td>
                  <td className="px-6 py-4">
                    {sub.items[0] && (
                      <div>
                        <div className="font-medium">{sub.items[0].productName}</div>
                        <div className="text-sm text-gray-500">
                          ${sub.items[0].amount}/{sub.items[0].interval}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[sub.status] || 'bg-gray-100'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {sub.status === 'active' && !sub.cancelAtPeriodEnd && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => cancelSubscription(sub.id, false)}
                          className="text-xs text-orange-600 hover:text-orange-800"
                        >
                          Cancelar al final
                        </button>
                        <button
                          onClick={() => cancelSubscription(sub.id, true)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Cancelar ahora
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

