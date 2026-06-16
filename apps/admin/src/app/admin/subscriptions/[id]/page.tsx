'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface SubscriptionDetail {
  id: string;
  tenantId: string;
  userId: string;
  membershipId: string;
  status: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  lastPaymentDate?: string;
  nextPaymentDate?: string;
  daysPastDue?: number;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  tenantName?: string;
  userName?: string;
  membershipName?: string;
  amount?: number;
}

function formatDate(value?: string) {
  if (!value) return 'N/A';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('es-ES');
}

export default function SubscriptionDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void loadSubscription(id);
  }, [id]);

  async function loadSubscription(subscriptionId: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(`/api/admin/subscriptions/${subscriptionId}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setSubscription(data.subscription || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la suscripción');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <Link href="/admin/subscriptions" className="text-primary-600 hover:underline">
          ← Volver a suscripciones
        </Link>
        <div className="mt-6 bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">No se pudo cargar la suscripción</h1>
          <p className="text-gray-600">{error || 'Suscripción no encontrada'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/subscriptions" className="text-primary-600 hover:underline">
          ← Volver a suscripciones
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Detalle de suscripción</h1>
        <p className="text-gray-500 mb-8 font-mono text-sm">{subscription.id}</p>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <dt className="text-sm text-gray-500">Tenant</dt>
            <dd className="font-medium">{subscription.tenantName || subscription.tenantId}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Usuario</dt>
            <dd className="font-medium">{subscription.userName || subscription.userId}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Membresía</dt>
            <dd className="font-medium">
              {subscription.membershipName || subscription.membershipId}
              {subscription.amount != null ? ` — $${subscription.amount}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Estado</dt>
            <dd className="font-medium capitalize">{subscription.status}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Período actual</dt>
            <dd className="font-medium">
              {formatDate(subscription.currentPeriodStart)} — {formatDate(subscription.currentPeriodEnd)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Último pago</dt>
            <dd className="font-medium">{formatDate(subscription.lastPaymentDate)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Próximo pago</dt>
            <dd className="font-medium">{formatDate(subscription.nextPaymentDate)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Días de atraso</dt>
            <dd className="font-medium">
              {subscription.daysPastDue && subscription.daysPastDue > 0
                ? `${subscription.daysPastDue} días`
                : '—'}
            </dd>
          </div>
          {subscription.stripeSubscriptionId ? (
            <div className="md:col-span-2">
              <dt className="text-sm text-gray-500">Stripe Subscription ID</dt>
              <dd className="font-mono text-sm break-all">{subscription.stripeSubscriptionId}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
