import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';
import { getStripeInstance } from '@autodealers/core';

export const dynamic = 'force-dynamic';

/**
 * GET - Obtiene todos los productos/planes
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    const stripe = await getStripeInstance();

    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });

    // Obtener precios para cada producto
    const productsWithPrices = await Promise.all(
      products.data.map(async (product) => {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
        });

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          active: product.active,
          metadata: product.metadata,
          prices: prices.data.map((price) => ({
            id: price.id,
            amount: price.unit_amount ? price.unit_amount / 100 : 0,
            currency: price.currency,
            interval: price.recurring?.interval,
            intervalCount: price.recurring?.interval_count,
          })),
        };
      })
    );

    return createSuccessResponse({
      products: productsWithPrices,
      count: productsWithPrices.length,
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return createErrorResponse(error.message || 'Error al cargar productos', 500);
  }
}

/**
 * POST - Crea un nuevo producto/plan
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    const stripe = await getStripeInstance();

    const body = await request.json();
    const { name, description, price, currency, interval, metadata } = body;

    // Crear producto
    const product = await stripe.products.create({
      name,
      description,
      metadata: metadata || {},
    });

    // Crear precio
    const priceObj = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(price * 100), // Convertir a cents
      currency: currency || 'usd',
      recurring: interval ? { interval } : undefined,
    });

    return createSuccessResponse(
      {
        product: {
          id: product.id,
          name: product.name,
          priceId: priceObj.id,
        },
        message: 'Producto creado exitosamente',
      },
      201
    );
  } catch (error: any) {
    console.error('Error creating product:', error);
    return createErrorResponse(error.message || 'Error al crear producto', 500);
  }
}


