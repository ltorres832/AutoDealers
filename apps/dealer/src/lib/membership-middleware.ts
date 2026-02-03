// Middleware para validación automática de features de membresía

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from './auth';
import { canExecuteFeature, FeatureAction } from '@autodealers/core';

/**
 * Middleware para validar que el tenant puede ejecutar una acción
 */
export async function validateMembershipFeature(
  request: NextRequest,
  action: FeatureAction
): Promise<NextResponse | null> {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Admin siempre tiene acceso
    if (auth.role === 'admin') {
      return null; // null = continuar sin restricciones
    }

    // Validar que el tenant tiene la feature
    if (!auth.tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    const featureCheck = await canExecuteFeature(auth.tenantId, action);

    if (!featureCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Feature not available',
          reason: featureCheck.reason,
          limit: featureCheck.limit,
          current: featureCheck.current,
          remaining: featureCheck.remaining,
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    return null; // Continuar sin restricciones
  } catch (error: any) {
    console.error('Error validating membership feature:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper para verificar múltiples features
 */
export async function validateAnyFeature(
  request: NextRequest,
  actions: FeatureAction[]
): Promise<NextResponse | null> {
  for (const action of actions) {
    const result = await validateMembershipFeature(request, action);
    if (result !== null) {
      return result; // Retornar el primer error encontrado
    }
  }
  return null; // Todas las features están disponibles
}

/**
 * Decorator para endpoints API que requieren validación de features
 */
export function withFeatureValidation(
  action: FeatureAction,
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]) => {
    const validationResult = await validateMembershipFeature(request, action);
    if (validationResult !== null) {
      return validationResult;
    }
    return handler(request, ...args);
  };
}


