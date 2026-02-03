import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - carga dinámica para evitar error de tipos en build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getAdvertiserPricingConfig } = require('@autodealers/core') as any;

export async function GET(request: NextRequest) {
  try {
    const config = await getAdvertiserPricingConfig();

    // No exponer priceId públicamente, solo información visible
    return NextResponse.json({
      plans: {
        starter: {
          name: config.starter.name,
          amount: config.starter.amount,
          currency: config.starter.currency,
          features: config.starter.features,
        },
        professional: {
          name: config.professional.name,
          amount: config.professional.amount,
          currency: config.professional.currency,
          features: config.professional.features,
        },
        premium: {
          name: config.premium.name,
          amount: config.premium.amount,
          currency: config.premium.currency,
          features: config.premium.features,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching advertiser pricing:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

