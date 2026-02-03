import { NextRequest, NextResponse } from 'next/server';
import { getAdvertiserPricingConfig } from '@autodealers/core';

// Configuración por defecto si no se puede acceder a Firestore
const DEFAULT_PLANS = {
  starter: {
    name: 'Starter',
    amount: 9900, // $99.00 en centavos
    currency: 'usd',
    features: [
      '1 banner en sección patrocinadores',
      '10,000 impresiones/mes',
      'Dashboard básico',
      'Soporte por email',
      'Targeting básico',
    ],
    priceId: '', // Se creará al guardar desde el admin
  },
  professional: {
    name: 'Professional',
    amount: 29900, // $299.00 en centavos
    currency: 'usd',
    features: [
      '2 banners (patrocinadores + sidebar)',
      '50,000 impresiones/mes',
      'Dashboard avanzado',
      'Soporte prioritario',
      'Targeting avanzado',
      'Métricas en tiempo real',
    ],
    priceId: '', // Se creará al guardar desde el admin
  },
  premium: {
    name: 'Premium',
    amount: 59900, // $599.00 en centavos
    currency: 'usd',
    features: [
      'Banner en Hero (rotación)',
      'Impresiones ilimitadas',
      'Targeting avanzado',
      'A/B testing',
      'Métricas avanzadas',
      'Soporte 24/7',
    ],
    priceId: '', // Se creará al guardar desde el admin
  },
};

export async function GET(request: NextRequest) {
  try {
    const config = await getAdvertiserPricingConfig();

    return NextResponse.json({
      plans: {
        starter: {
          name: config.starter.name,
          amount: config.starter.amount,
          currency: config.starter.currency,
          features: config.starter.features,
          priceId: config.starter.priceId || '', // Necesario para el checkout
        },
        professional: {
          name: config.professional.name,
          amount: config.professional.amount,
          currency: config.professional.currency,
          features: config.professional.features,
          priceId: config.professional.priceId || '', // Necesario para el checkout
        },
        premium: {
          name: config.premium.name,
          amount: config.premium.amount,
          currency: config.premium.currency,
          features: config.premium.features,
          priceId: config.premium.priceId || '', // Necesario para el checkout
        },
      },
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Error fetching advertiser pricing:', error);
    console.error('Stack:', error.stack);
    
    // Si hay error, devolver configuración por defecto
    // Esto permite que la página funcione aunque Firebase no esté configurado
    console.warn('⚠️ Usando configuración por defecto debido a error:', error.message);
    
    return NextResponse.json({
      plans: {
        starter: {
          name: DEFAULT_PLANS.starter.name,
          amount: DEFAULT_PLANS.starter.amount,
          currency: DEFAULT_PLANS.starter.currency,
          features: DEFAULT_PLANS.starter.features,
          priceId: DEFAULT_PLANS.starter.priceId,
        },
        professional: {
          name: DEFAULT_PLANS.professional.name,
          amount: DEFAULT_PLANS.professional.amount,
          currency: DEFAULT_PLANS.professional.currency,
          features: DEFAULT_PLANS.professional.features,
          priceId: DEFAULT_PLANS.professional.priceId,
        },
        premium: {
          name: DEFAULT_PLANS.premium.name,
          amount: DEFAULT_PLANS.premium.amount,
          currency: DEFAULT_PLANS.premium.currency,
          features: DEFAULT_PLANS.premium.features,
          priceId: DEFAULT_PLANS.premium.priceId,
        },
      },
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

