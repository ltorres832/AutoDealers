'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { BillingAccessBanner } from '@autodealers/shared/client';

const GRACE_DAYS = 3;

function isBillingBlocked(status: string, daysPastDue: number): boolean {
  if (status === 'suspended' || status === 'unpaid' || status === 'cancelled') return true;
  if (status === 'past_due' && daysPastDue >= GRACE_DAYS) return true;
  return false;
}

export function BillingAccessGuard({
  tenantId,
  membershipId,
  userReady = true,
  children,
}: {
  tenantId?: string;
  membershipId?: string;
  userReady?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { subscription, loading } = useRealtimeSubscription(tenantId);

  const onMembershipPage =
    pathname?.startsWith('/settings/membership') || pathname === '/login';

  const hasAssignedMembership = Boolean(membershipId?.trim());

  const needsOnboarding =
    userReady &&
    !loading &&
    !subscription &&
    !hasAssignedMembership &&
    !onMembershipPage;

  const blocked =
    !loading &&
    subscription &&
    isBillingBlocked(subscription.status, subscription.daysPastDue ?? 0);

  useEffect(() => {
    if (!userReady || loading || onMembershipPage) return;
    if (needsOnboarding) {
      router.replace('/settings/membership?onboarding=required');
      return;
    }
    if (blocked) {
      router.replace('/settings/membership?billing=suspended');
    }
  }, [userReady, loading, needsOnboarding, blocked, onMembershipPage, router]);

  if (!userReady || loading) {
    return <>{children}</>;
  }

  if (needsOnboarding && !onMembershipPage) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 bg-white rounded-lg shadow text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Activa tu concesionario</h2>
        <p className="text-gray-600 mb-4">
          Selecciona y paga una membresía para acceder a todas las funciones de la plataforma.
        </p>
        <a
          href="/settings/membership?onboarding=required"
          className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700"
        >
          Elegir plan y pagar
        </a>
      </div>
    );
  }

  if (!subscription) {
    return <>{children}</>;
  }

  return (
    <>
      {!onMembershipPage && (
        <BillingAccessBanner
          status={subscription.status}
          daysPastDue={subscription.daysPastDue}
          graceDays={GRACE_DAYS}
          settingsHref="/settings/membership"
        />
      )}
      {blocked && !onMembershipPage ? (
        <div className="max-w-lg mx-auto mt-16 p-8 bg-white rounded-lg shadow text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cuenta suspendida</h2>
          <p className="text-gray-600 mb-4">
            Realiza el pago de tu membresía para reactivar el acceso a la plataforma.
          </p>
          <a
            href="/settings/membership"
            className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700"
          >
            Pagar membresía
          </a>
        </div>
      ) : (
        children
      )}
    </>
  );
}
