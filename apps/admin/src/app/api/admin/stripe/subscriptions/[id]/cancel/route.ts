import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';
import { getStripeInstance } from '@autodealers/core';

export const dynamic = 'force-dynamic';

/**
 * POST - Cancela una suscripción
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    const { id } = await params;
    const stripe = await getStripeInstance();

    const body = await request.json();
    const { immediately = false } = body;

    let subscription;
    
    if (immediately) {
      // Cancelar inmediatamente
      subscription = await stripe.subscriptions.cancel(id);
    } else {
      // Cancelar al final del período
      subscription = await stripe.subscriptions.update(id, {
        cancel_at_period_end: true,
      });
    }

    return createSuccessResponse({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at,
      },
      message: immediately
        ? 'Suscripción cancelada inmediatamente'
        : 'Suscripción se cancelará al final del período',
    });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    return createErrorResponse(error.message || 'Error al cancelar suscripción', 500);
  }
}


