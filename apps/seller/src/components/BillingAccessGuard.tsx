'use client';

import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { BillingAccessBanner } from '@autodealers/shared/client';
import { resolveBillingTenantId } from '@/lib/billing-tenant';

const GRACE_DAYS = 3;

function isBillingBlocked(status: string, daysPastDue: number): boolean {
  if (status === 'suspended' || status === 'unpaid' || status === 'cancelled') return true;
  if (status === 'incomplete' || status === 'incomplete_expired') return true;
  if (status === 'past_due' && daysPastDue >= GRACE_DAYS) return true;
  return false;
}

export function BillingAccessGuard({
  tenantId,
  dealerId,
  billingMode,
  children,
}: {
  tenantId?: string;
  dealerId?: string;
  billingMode?: 'self_service' | 'dealer_managed';
  adminMembershipAccess?: 'granted' | 'required';
  userReady?: boolean;
  supportMode?: boolean;
  children: React.ReactNode;
}) {
  const billingTenantId = resolveBillingTenantId(tenantId, dealerId, billingMode);
  const dealerManaged = billingMode === 'self_service' ? false : Boolean(dealerId?.trim());
  const { subscription, loading } = useRealtimeSubscription(billingTenantId);

  const blocked =
    !loading &&
    Boolean(subscription) &&
    isBillingBlocked(subscription!.status, subscription!.daysPastDue ?? 0);

  return (
    <>
      {!dealerManaged && subscription && (
        <BillingAccessBanner
          status={subscription.status}
          daysPastDue={subscription.daysPastDue}
          graceDays={GRACE_DAYS}
          settingsHref="/settings/membership"
        />
      )}
      {blocked && !dealerManaged ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tu membresía no está activa. Puedes seguir en el dashboard; para usar módulos de pago,{' '}
          <a href="/settings/membership" className="font-semibold underline">
            selecciona o activa tu membresía
          </a>
          .
        </div>
      ) : null}
      {children}
    </>
  );
}
