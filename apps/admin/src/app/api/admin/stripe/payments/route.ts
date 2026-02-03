import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';
import { getStripeInstance } from '@autodealers/core';

export const dynamic = 'force-dynamic';

/**
 * GET - Obtiene todos los pagos/transacciones
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    const stripe = await getStripeInstance();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status'); // succeeded, pending, failed

    const params: any = {
      limit,
      expand: ['data.customer'],
    };

    const paymentIntents = await stripe.paymentIntents.list(params);

    const enrichedPayments = paymentIntents.data
      .filter((pi) => !status || pi.status === status)
      .map((pi) => ({
        id: pi.id,
        amount: pi.amount / 100,
        currency: pi.currency.toUpperCase(),
        status: pi.status as any,
        customerId: typeof pi.customer === 'string' ? pi.customer : pi.customer?.id,
        customerEmail: typeof pi.customer === 'object' ? (pi.customer as any)?.email : null,
        description: pi.description,
        created: new Date(pi.created * 1000),
        paymentMethod: pi.payment_method_types[0],
      }));

    // Calcular estadísticas
    const stats = {
      total: enrichedPayments.length,
      totalAmount: enrichedPayments.reduce((sum, p) => sum + p.amount, 0),
      succeeded: enrichedPayments.filter((p) => p.status === 'succeeded').length,
      pending: enrichedPayments.filter((p) => p.status === 'processing' || p.status === 'requires_action').length,
      failed: enrichedPayments.filter((p) => (p.status as any) === 'canceled' || (p.status as any) === 'failed').length,
    };

    return createSuccessResponse({
      payments: enrichedPayments,
      stats,
      hasMore: paymentIntents.has_more,
    });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return createErrorResponse(error.message || 'Error al cargar pagos', 500);
  }
}


