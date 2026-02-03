import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';
import { getStripeInstance } from '@autodealers/core';

export const dynamic = 'force-dynamic';

/**
 * POST - Crea un reembolso
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
    const { amount, reason } = body; // amount en cents, reason: duplicate, fraudulent, requested_by_customer

    const refundParams: any = {
      payment_intent: id,
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100); // Convertir a cents
    }

    if (reason) {
      refundParams.reason = reason;
    }

    const refund = await stripe.refunds.create(refundParams);

    return createSuccessResponse({
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        created: new Date(refund.created * 1000),
      },
      message: 'Reembolso procesado exitosamente',
    });
  } catch (error: any) {
    console.error('Error creating refund:', error);
    return createErrorResponse(error.message || 'Error al procesar reembolso', 500);
  }
}


