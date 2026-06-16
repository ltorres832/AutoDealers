import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance } from '@autodealers/core';
import { isCheckoutSessionBillingComplete } from '@autodealers/billing/membership-trial';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID is required' },
      { status: 400 }
    );
  }

  try {
    const stripe = await getStripeInstance();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    const paid = isCheckoutSessionBillingComplete(session);

    let subscriptionStatus: string | null = null;
    let trialEndsAt: string | null = null;
    const rawSub = session.subscription;
    if (rawSub && typeof rawSub === 'object' && 'status' in rawSub) {
      subscriptionStatus = rawSub.status ?? null;
      if (rawSub.trial_end) {
        trialEndsAt = new Date(rawSub.trial_end * 1000).toISOString();
      }
    } else if (typeof rawSub === 'string') {
      const sub = await stripe.subscriptions.retrieve(rawSub);
      subscriptionStatus = sub.status;
      if (sub.trial_end) {
        trialEndsAt = new Date(sub.trial_end * 1000).toISOString();
      }
    }

    const trialing = subscriptionStatus === 'trialing';

    let membershipActive = false;

    if (paid && session.metadata?.tenantId) {
      try {
        const { getFirestore } = await import('@autodealers/core');
        const db = getFirestore();

        const subscriptionSnapshot = await db
          .collection('subscriptions')
          .where('tenantId', '==', session.metadata.tenantId)
          .where('status', 'in', ['active', 'trialing'])
          .limit(1)
          .get();

        membershipActive = !subscriptionSnapshot.empty;
      } catch {
        membershipActive = false;
      }
    }

    return NextResponse.json({
      verified: true,
      paid,
      trialing,
      trialEndsAt,
      membershipActive,
      status: session.status,
      subscriptionId: typeof rawSub === 'string' ? rawSub : rawSub?.id ?? null,
      subscriptionStatus,
    });
  } catch (error: any) {
    console.error('❌ [VERIFY SESSION] Error verifying checkout session:', error);

    if (error?.code?.includes('auth') || error?.message?.includes('auth')) {
      try {
        const stripe = await getStripeInstance();
        const session = await stripe.checkout.sessions.retrieve(sessionId!);
        return NextResponse.json({
          verified: true,
          paid: isCheckoutSessionBillingComplete(session),
          membershipActive: false,
          status: session.status,
          subscriptionId: session.subscription,
          warning: 'No se pudo verificar la membresía, pero el checkout está procesado',
        });
      } catch {
        /* fall through */
      }
    }

    return NextResponse.json(
      {
        error: 'Error al verificar la sesión',
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
