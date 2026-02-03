import { NextRequest, NextResponse } from 'next/server';
import { FeatureAction } from './feature-executor';
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
export declare function validateFeature(request: NextRequest, action: FeatureAction, getAuth: (request: NextRequest) => Promise<AuthResult | null>): Promise<NextResponse | null>;
/**
 * Wrapper para rutas API que requieren validación de features
 *
 * @param handler - Handler de la ruta API
 * @param action - Acción a validar
 * @param getAuth - Función que obtiene la autenticación (debe ser proporcionada por la app)
 */
export declare function withFeatureValidation(handler: (request: NextRequest) => Promise<NextResponse>, action: FeatureAction, getAuth: (request: NextRequest) => Promise<AuthResult | null>): (request: NextRequest) => Promise<NextResponse<unknown>>;
//# sourceMappingURL=feature-middleware.d.ts.map