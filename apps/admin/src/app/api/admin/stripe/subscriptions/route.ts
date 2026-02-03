import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';
import { getStripeInstance } from '@autodealers/core';

export const dynamic = 'force-dynamic';

/**
 * GET - Obtiene todas las suscripciones de Stripe
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    const stripe = await getStripeInstance();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // active, canceled, past_due, etc.
    const limit = parseInt(searchParams.get('limit') || '50');

    const params: any = {
      limit,
      expand: ['data.customer', 'data.items.data.price.product'],
    };

    if (status) {
      params.status = status as any;
    }

    const subscriptions = await stripe.subscriptions.list(params);

    // Obtener información adicional del tenant desde Firestore
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();

    const enrichedSubscriptions = await Promise.all(
      subscriptions.data.map(async (sub) => {
        let tenantInfo = null;
        
        // Buscar tenant por customerId de Stripe
        if (typeof sub.customer === 'string') {
          const tenantsSnapshot = await db
            .collection('tenants')
            .where('stripeCustomerId', '==', sub.customer)
            .limit(1)
            .get();

          if (!tenantsSnapshot.empty) {
            const tenantData = tenantsSnapshot.docs[0].data();
            tenantInfo = {
              id: tenantsSnapshot.docs[0].id,
              name: tenantData.name,
              email: tenantData.email,
              type: tenantData.type,
            };
          }
        }

        return {
          id: sub.id,
          status: sub.status,
          customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
          customerEmail: typeof sub.customer === 'object' ? (sub.customer as any)?.email : null,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
          items: sub.items.data.map((item) => ({
            id: item.id,
            priceId: item.price.id,
            productName: typeof item.price.product === 'object' ? (item.price.product as any)?.name : null,
            amount: item.price.unit_amount ? item.price.unit_amount / 100 : 0,
            currency: item.price.currency,
            interval: item.price.recurring?.interval,
          })),
          tenantInfo,
        };
      })
    );

    return createSuccessResponse({
      subscriptions: enrichedSubscriptions,
      hasMore: subscriptions.has_more,
      count: enrichedSubscriptions.length,
    });
  } catch (error: any) {
    console.error('Error fetching Stripe subscriptions:', error);
    return createErrorResponse(error.message || 'Error al cargar suscripciones', 500);
  }
}


