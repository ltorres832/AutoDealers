import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getSubscriptionByUserId,
  getMembershipById,
  isDealerManagedSeller,
} from '@autodealers/billing';
import { getUserById } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isDealerManagedSeller(auth.dealerId, auth.billingMode)) {
      return NextResponse.json(
        {
          error: 'dealer_managed',
          message: 'Tu acceso lo gestiona tu concesionario. No hay información de membresía en tu cuenta.',
        },
        { status: 403 }
      );
    }

    const user = await getUserById(auth.userId);
    const subscription = await getSubscriptionByUserId(auth.userId);
    const membershipId = subscription?.membershipId || user?.membershipId;

    if (!membershipId) {
      return NextResponse.json(
        {
          error: 'No subscription found',
          dealerManaged: false,
          message: 'No tienes una suscripción activa. Selecciona un plan de membresía.',
        },
        { status: 404 }
      );
    }

    const membership = await getMembershipById(membershipId);

    if (!membership) {
      return NextResponse.json(
        {
          error: 'Membership not found',
          dealerManaged: false,
          membershipId,
          message: 'No se encontró información del plan. Contacta a soporte.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      membership,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            daysPastDue: subscription.daysPastDue,
            statusReason: subscription.statusReason,
          }
        : null,
      dealerManaged: false,
    });
  } catch (error: unknown) {
    console.error('❌ [SELLER MEMBERSHIP] Error fetching membership:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
