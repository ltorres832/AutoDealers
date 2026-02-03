import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getPricingConfig } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener configuración de precios
    const pricingConfig = await getPricingConfig();

    // Opciones de promociones pagadas disponibles (solo vehicle y dealer para dealers)
    const options = [
      {
        id: 'vehicle',
        name: 'Promoción de Vehículo',
        description: 'Promociona un vehículo específico en la landing page',
        promotionScope: 'vehicle' as const,
        prices: pricingConfig.promotions.vehicle.prices,
        durations: pricingConfig.promotions.vehicle.durations,
      },
      {
        id: 'dealer',
        name: 'Promoción de Dealer',
        description: 'Promociona todo tu dealer en la landing page',
        promotionScope: 'dealer' as const,
        prices: pricingConfig.promotions.dealer.prices,
        durations: pricingConfig.promotions.dealer.durations,
      },
    ];

    return NextResponse.json({ options });
  } catch (error: any) {
    console.error('Error fetching paid promotion options:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

