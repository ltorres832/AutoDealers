import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getSubscriptionByTenantId,
  getMembershipById,
  isDealerManagedSeller,
  resolveBillingTenantId,
} from '@autodealers/billing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isDealerManagedSeller(auth.dealerId)) {
      return NextResponse.json(
        {
          error: 'dealer_managed',
          message: 'Tu acceso lo gestiona tu concesionario. No hay información de membresía en tu cuenta.',
        },
        { status: 403 }
      );
    }

    const billingTenantId = resolveBillingTenantId(auth.tenantId, auth.dealerId);

    if (!billingTenantId) {
      return NextResponse.json(
        {
          error: 'No billing tenant',
          message: 'No tienes una suscripción activa. Selecciona un plan de membresía.',
        },
        { status: 404 }
      );
    }

    const subscription = await getSubscriptionByTenantId(billingTenantId);

    if (!subscription) {
      return NextResponse.json(
        {
          error: 'No subscription found',
          dealerManaged: false,
          message: 'No tienes una suscripción activa. Selecciona un plan de membresía.',
        },
        { status: 404 }
      );
    }

    if (!subscription.membershipId) {
      return NextResponse.json(
        {
          error: 'Invalid subscription',
          dealerManaged: false,
          message: 'La suscripción no tiene un plan asociado. Contacta a soporte.',
        },
        { status: 400 }
      );
    }

    const membership = await getMembershipById(subscription.membershipId);

    if (!membership) {
      return NextResponse.json(
        {
          error: 'Membership not found',
          dealerManaged: false,
          membershipId: subscription.membershipId,
          message: 'No se encontró información del plan. Contacta a soporte.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      membership,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        daysPastDue: subscription.daysPastDue,
        statusReason: subscription.statusReason,
      },
      dealerManaged: false,
      billingTenantId,
    });
  } catch (error: unknown) {
    console.error('❌ [SELLER MEMBERSHIP] Error fetching membership:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
