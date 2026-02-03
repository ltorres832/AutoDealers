import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAdvertiserPricingConfig, updateAdvertiserPlan } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getAdvertiserPricingConfig();

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('Error fetching advertiser pricing:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { plan, config: planConfig } = body;

    if (!plan || !['starter', 'professional', 'premium'].includes(plan)) {
      return NextResponse.json(
        { error: 'Plan inválido' },
        { status: 400 }
      );
    }

    if (!planConfig || !planConfig.name || planConfig.amount === undefined) {
      return NextResponse.json(
        { error: 'Nombre y precio son requeridos' },
        { status: 400 }
      );
    }

    // Validar que amount esté en centavos y sea positivo
    if (planConfig.amount < 0) {
      return NextResponse.json(
        { error: 'El precio debe ser positivo' },
        { status: 400 }
      );
    }

    // Sincronizar con Stripe automáticamente
    const updatedConfig = await updateAdvertiserPlan(
      plan as 'starter' | 'professional' | 'premium',
      {
        name: planConfig.name,
        amount: planConfig.amount,
        currency: planConfig.currency || 'usd',
        features: planConfig.features || [],
      },
      auth.userId
    );

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      message: 'Plan actualizado y sincronizado con Stripe exitosamente',
    });
  } catch (error: any) {
    console.error('Error updating advertiser pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

