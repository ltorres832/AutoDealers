import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';
import { getStripeInstance } from '@autodealers/core';

export const dynamic = 'force-dynamic';

/**
 * GET - Dashboard con estadísticas generales de Stripe
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    const stripe = await getStripeInstance();

    // Obtener balance
    const balance = await stripe.balance.retrieve();

    // Obtener suscripciones activas
    const activeSubscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
    });

    // Obtener pagos del último mes
    const lastMonth = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const recentPayments = await stripe.paymentIntents.list({
      created: { gte: lastMonth },
      limit: 100,
    });

    // Calcular métricas
    const totalRevenue = recentPayments.data
      .filter((p) => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0) / 100;

    const monthlyRecurringRevenue = activeSubscriptions.data.reduce((sum, sub) => {
      const amount = sub.items.data[0]?.price?.unit_amount || 0;
      return sum + amount;
    }, 0) / 100;

    // Obtener clientes
    const customers = await stripe.customers.list({ limit: 100 });

    // Obtener productos
    const products = await stripe.products.list({ active: true });

    const stats = {
      balance: {
        available: balance.available.map((b) => ({
          amount: b.amount / 100,
          currency: b.currency,
        })),
        pending: balance.pending.map((p) => ({
          amount: p.amount / 100,
          currency: p.currency,
        })),
      },
      subscriptions: {
        active: activeSubscriptions.data.length,
        totalMRR: monthlyRecurringRevenue,
      },
      revenue: {
        lastMonth: totalRevenue,
        transactionsCount: recentPayments.data.filter((p) => p.status === 'succeeded').length,
      },
      customers: {
        total: customers.data.length,
        hasMore: customers.has_more,
      },
      products: {
        total: products.data.length,
      },
    };

    return createSuccessResponse({ stats });
  } catch (error: any) {
    console.error('Error fetching Stripe dashboard:', error);
    return createErrorResponse(error.message || 'Error al cargar dashboard', 500);
  }
}


