import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSubscriptionByTenantId, changeMembership } from '@autodealers/billing';
import { getMembershipById, isDealerManagedSeller, assertSelfServiceMembership } from '@autodealers/billing';
import { getMembershipTrialDays } from '@autodealers/billing/membership-trial';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isDealerManagedSeller(auth.dealerId)) {
      return NextResponse.json(
        {
          error: 'dealer_managed',
          message: 'Tu plan lo gestiona tu concesionario. No puedes cambiar la membresía desde aquí.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { membershipId } = body;

    if (!membershipId) {
      return NextResponse.json({ error: 'Membership ID is required' }, { status: 400 });
    }

    const newMembership = await getMembershipById(membershipId);
    if (!newMembership || !newMembership.isActive || newMembership.type !== 'seller') {
      return NextResponse.json({ error: 'Invalid membership' }, { status: 400 });
    }

    const selfServiceCheck = assertSelfServiceMembership(newMembership);
    if (!selfServiceCheck.ok) {
      return NextResponse.json({ error: selfServiceCheck.error }, { status: 403 });
    }

    const subscription = await getSubscriptionByTenantId(auth.tenantId);

    if (!subscription || !subscription.stripeSubscriptionId?.trim()) {
      return NextResponse.json(
        {
          error: 'payment_required',
          requiresPayment: true,
          membershipId,
          trialDays: getMembershipTrialDays(),
          message:
            'Registra tu método de pago para activar la membresía. Incluye 14 días de prueba gratis; el cobro mensual inicia automáticamente al terminar.',
        },
        { status: 402 }
      );
    }

    await changeMembership(subscription.id, membershipId, newMembership.stripePriceId);

    return NextResponse.json({
      success: true,
      message: 'Membership changed successfully',
    });
  } catch (error: any) {
    console.error('Error changing membership:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
