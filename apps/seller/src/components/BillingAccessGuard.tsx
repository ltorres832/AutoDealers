'use client';



import { useEffect } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

import { BillingAccessBanner } from '@autodealers/shared/client';

import { resolveBillingTenantId } from '@/lib/billing-tenant';



const GRACE_DAYS = 3;



function isBillingBlocked(status: string, daysPastDue: number): boolean {

  if (status === 'suspended' || status === 'unpaid' || status === 'cancelled') return true;

  if (status === 'past_due' && daysPastDue >= GRACE_DAYS) return true;

  return false;

}



function isActiveSubscription(status: string | undefined): boolean {

  return status === 'active' || status === 'trialing';

}



export function BillingAccessGuard({

  tenantId,

  dealerId,

  adminMembershipAccess,

  userReady = true,

  children,

}: {

  tenantId?: string;

  dealerId?: string;

  adminMembershipAccess?: 'granted' | 'required';

  userReady?: boolean;

  children: React.ReactNode;

}) {

  const pathname = usePathname();

  const router = useRouter();

  const billingTenantId = resolveBillingTenantId(tenantId, dealerId);

  const dealerManaged = Boolean(dealerId?.trim());

  const { subscription, loading } = useRealtimeSubscription(billingTenantId);



  const onMembershipPage =
    !dealerManaged &&
    (pathname?.startsWith('/settings/membership') ||
      pathname?.startsWith('/settings/dealer-link') ||
      pathname?.startsWith('/join-dealer') ||
      pathname === '/login');



  const hasAdminMembershipAccess = adminMembershipAccess === 'granted';

  const needsOnboarding =

    userReady &&
    !dealerManaged &&
    !hasAdminMembershipAccess &&
    !loading &&
    !subscription &&
    !onMembershipPage;



  const blocked =

    !loading &&

    subscription &&

    isBillingBlocked(subscription.status, subscription.daysPastDue ?? 0);



  const hasAccess =

    dealerManaged

      ? !blocked

      : !needsOnboarding &&

        (!subscription || isActiveSubscription(subscription.status) || !blocked);



  useEffect(() => {

    if (!userReady || loading || onMembershipPage) return;

    if (needsOnboarding) {

      router.replace('/settings/membership?onboarding=required');

      return;

    }

    if (blocked) {

      router.replace(

        dealerManaged

          ? '/settings?billing=dealer-suspended'

          : '/settings/membership?billing=suspended'

      );

    }

  }, [userReady, loading, needsOnboarding, blocked, onMembershipPage, router, dealerManaged]);



  if (!userReady || loading) {

    return <>{children}</>;

  }



  if (needsOnboarding && !onMembershipPage) {

    return (

      <div className="max-w-lg mx-auto mt-16 p-8 bg-white rounded-lg shadow text-center">

        <h2 className="text-xl font-bold text-gray-900 mb-2">Activa tu cuenta</h2>

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

      {!onMembershipPage && !dealerManaged && (

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

            {dealerManaged

              ? 'El acceso depende de la membresía de tu concesionario, que no está activa. Contacta a tu dealer para resolver el pago.'

              : 'Realiza el pago de tu membresía para reactivar el acceso a la plataforma.'}

          </p>

          {!dealerManaged && (

            <a

              href="/settings/membership"

              className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700"

            >

              Pagar membresía

            </a>

          )}

        </div>

      ) : hasAccess || onMembershipPage ? (

        children

      ) : (

        children

      )}

    </>

  );

}

