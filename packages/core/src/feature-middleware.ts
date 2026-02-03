// Middleware para validar features antes de ejecutar acciones

import { NextRequest, NextResponse } from 'next/server';
import { canExecuteFeature, FeatureAction, recordFeatureUsage } from './feature-executor';

export interface AuthResult {
  tenantId?: string;
  userId?: string;
  role?: string;
  [key: string]: any;
}

/**
 * Middleware para validar features en rutas API
 * 
 * @param request - Request de Next.js
 * @param action - Acción a validar
 * @param getAuth - Función que obtiene la autenticación (debe ser proporcionada por la app)
 */
export async function validateFeature(
  request: NextRequest,
  action: FeatureAction,
  getAuth: (request: NextRequest) => Promise<AuthResult | null>
): Promise<NextResponse | null> {
  try {
    const auth = await getAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', reason: 'No autenticado o sin tenantId' },
        { status: 401 }
      );
    }

    const check = await canExecuteFeature(auth.tenantId, action);

    if (!check.allowed) {
      // Registrar intento fallido
      await recordFeatureUsage(auth.tenantId, action, {
        success: false,
        reason: check.reason,
      });

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

    // Registrar uso exitoso
    await recordFeatureUsage(auth.tenantId, action, {
      success: true,
    });

    return null; // Permitir continuar
  } catch (error) {
    console.error('Error validating feature:', error);
    return NextResponse.json(
      { error: 'Error al validar feature' },
      { status: 500 }
    );
  }
}

/**
 * Wrapper para rutas API que requieren validación de features
 * 
 * @param handler - Handler de la ruta API
 * @param action - Acción a validar
 * @param getAuth - Función que obtiene la autenticación (debe ser proporcionada por la app)
 */
export function withFeatureValidation(
  handler: (request: NextRequest) => Promise<NextResponse>,
  action: FeatureAction,
  getAuth: (request: NextRequest) => Promise<AuthResult | null>
) {
  return async (request: NextRequest) => {
    const validation = await validateFeature(request, action, getAuth);
    if (validation) {
      return validation;
    }

    return handler(request);
  };
}

