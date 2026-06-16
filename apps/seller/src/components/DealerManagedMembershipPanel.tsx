'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { resolveBillingTenantId } from '@/lib/billing-tenant';

interface MembershipInfo {
  id: string;
  name: string;
  type: string;
  price: number;
  currency: string;
  billingCycle: string;
  features: Record<string, unknown>;
}

interface DealerAccessResponse {
  membership: MembershipInfo;
  subscription: {
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    daysPastDue?: number;
    statusReason?: string;
    cancelAtPeriodEnd?: boolean;
  };
  dealerName?: string;
  dealerManaged: boolean;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'bg-green-100 text-green-700';
    case 'past_due':
    case 'unpaid':
      return 'bg-yellow-100 text-yellow-700';
    case 'suspended':
      return 'bg-red-100 text-red-700';
    case 'cancelled':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: 'Activa',
    past_due: 'Pago pendiente',
    cancelled: 'Cancelada',
    suspended: 'Suspendida',
    trialing: 'En prueba',
    unpaid: 'No pagado',
  };
  return labels[status] || status;
}

function formatDate(value: string | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function featureFlags(features: Record<string, unknown>) {
  const items: string[] = [];
  if (features.publicWebsite) items.push('Página web pública');
  if (features.crmAdvanced) items.push('CRM completo');
  if (features.socialMediaEnabled) items.push('Redes sociales');
  if (features.videoUploads) items.push('Subida de videos');
  if (features.liveChat) items.push('Chat en vivo');
  if (features.aiEnabled) items.push('IA habilitada');
  if (features.advancedReports) items.push('Reportes avanzados');
  if (features.customSubdomain) items.push('Subdominio personalizado');
  if (features.marketplaceEnabled) items.push('Marketplace');
  return items;
}

export function DealerManagedMembershipPanel({
  tenantId,
  dealerId,
}: {
  tenantId?: string;
  dealerId: string;
}) {
  const searchParams = useSearchParams();
  const billingTenantId = resolveBillingTenantId(tenantId, dealerId);
  const { subscription: liveSubscription, loading: subLoading } =
    useRealtimeSubscription(billingTenantId);
  const [data, setData] = useState<DealerAccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const billingAlert = searchParams.get('billing');

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const res = await fetch('/api/settings/membership', { credentials: 'include' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(
            (err as { message?: string }).message ||
              'No se pudo cargar el plan del concesionario'
          );
          return;
        }
        setData(await res.json());
      } catch {
        setError('Error al cargar la información del plan');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const subscription = liveSubscription ?? data?.subscription;
  const membership = data?.membership;
  const isLoading = loading || subLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan del concesionario</h1>
        <p className="text-gray-600">
          Tu acceso a la plataforma depende de la membresía de{' '}
          <strong>{data?.dealerName || 'tu concesionario'}</strong>.
        </p>
      </div>

      {(billingAlert === 'dealer-suspended' || subscription?.status === 'suspended') && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          El concesionario tiene la membresía suspendida. Contacta a tu dealer para reactivar el
          acceso.
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          {error}
        </div>
      )}

      {membership && subscription && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Concesionario</p>
              <h2 className="text-xl font-semibold">{data?.dealerName || 'Tu dealer'}</h2>
              <p className="text-gray-600 mt-2">
                Plan: <strong>{membership.name}</strong>
              </p>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}
            >
              {getStatusLabel(subscription.status)}
            </span>
          </div>

          {subscription.statusReason && (
            <p className="text-sm text-gray-600 mb-4">{subscription.statusReason}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Período actual</p>
              <p className="font-medium">
                {formatDate(String(subscription.currentPeriodStart))} –{' '}
                {formatDate(String(subscription.currentPeriodEnd))}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Gestión de pagos</p>
              <p className="font-medium">Administrada por el concesionario</p>
            </div>
          </div>

          {featureFlags(membership.features).length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-3">Incluido en tu acceso</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {featureFlags(membership.features).map((item) => (
                  <div key={item} className="text-sm">
                    <span className="text-green-600">✓</span> {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
        <h3 className="font-semibold text-primary-900 mb-2">¿Necesitas cambiar de plan?</h3>
        <p className="text-primary-800 text-sm mb-4">
          Como vendedor vinculado a un concesionario, no puedes contratar ni modificar membresías
          desde tu cuenta. Si necesitas más funciones o un plan distinto, habla con el administrador
          de tu dealer.
        </p>
        <Link
          href="/settings"
          className="text-sm font-medium text-primary-700 hover:text-primary-800"
        >
          ← Volver a configuración
        </Link>
      </div>
    </div>
  );
}
