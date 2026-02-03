// Ejemplo de cómo usar el sistema de features en una ruta API

import { NextRequest, NextResponse } from 'next/server';
import { withFeatureValidation } from '@autodealers/core';
import { createVehicle } from '@autodealers/inventory';
import { verifyAuth } from '@/lib/auth';

/**
 * Crear un vehículo - Requiere la feature 'addVehicle'
 */
export const POST = withFeatureValidation(
  async (request: NextRequest) => {
    try {
      const auth = await verifyAuth(request);
      if (!auth || !auth.tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const vehicle = await createVehicle(auth.tenantId, body);

      return NextResponse.json({ vehicle }, { status: 201 });
    } catch (error) {
      console.error('Error creating vehicle:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  'addVehicle', // Feature a validar
  verifyAuth // Función de autenticación
);

/**
 * Alternativa: Validación manual (recomendado)
 * Esta es la forma más simple y directa
 */
export async function POST_MANUAL(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validar feature manualmente
    const { canExecuteFeature } = await import('@autodealers/core');
    const check = await canExecuteFeature(auth.tenantId, 'addVehicle');

    if (!check.allowed) {
      return NextResponse.json(
        {
          error: 'Feature no disponible',
          reason: check.reason,
          limit: check.limit,
          current: check.current,
          remaining: check.remaining,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const vehicle = await createVehicle(auth.tenantId, body);

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

