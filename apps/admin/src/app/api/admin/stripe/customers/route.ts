import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';
import { getStripeInstance } from '@autodealers/core';

export const dynamic = 'force-dynamic';

/**
 * GET - Obtiene todos los clientes de Stripe
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
    const email = searchParams.get('email');

    const params: any = {
      limit,
    };

    if (email) {
      params.email = email;
    }

    const customers = await stripe.customers.list(params);

    // Obtener información adicional del tenant desde Firestore
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();

    const enrichedCustomers = await Promise.all(
      customers.data.map(async (customer) => {
        let tenantInfo = null;
        
        // Buscar tenant por customerId de Stripe
        const tenantsSnapshot = await db
          .collection('tenants')
          .where('stripeCustomerId', '==', customer.id)
          .limit(1)
          .get();

        if (!tenantsSnapshot.empty) {
          const tenantData = tenantsSnapshot.docs[0].data();
          tenantInfo = {
            id: tenantsSnapshot.docs[0].id,
            name: tenantData.name,
            type: tenantData.type,
            status: tenantData.status,
          };
        }

        return {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          description: customer.description,
          created: new Date(customer.created * 1000),
          balance: customer.balance / 100,
          currency: customer.currency,
          defaultSource: customer.default_source,
          metadata: customer.metadata,
          tenantInfo,
        };
      })
    );

    return createSuccessResponse({
      customers: enrichedCustomers,
      hasMore: customers.has_more,
      count: enrichedCustomers.length,
    });
  } catch (error: any) {
    console.error('Error fetching Stripe customers:', error);
    return createErrorResponse(error.message || 'Error al cargar clientes', 500);
  }
}


