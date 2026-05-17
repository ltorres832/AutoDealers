import { NextRequest } from 'next/server';
import { getAuth } from '@autodealers/core';
import { cookies } from 'next/headers';
import { DEALER_PORTAL_ROLES, isDealerPortalRole, isSellerRole } from './dealer-portal-roles';

const auth = getAuth();

export { DEALER_PORTAL_ROLES, isDealerPortalRole, isSellerRole };

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  /** Tenant para consultas de datos (inventario, leads, …); respeta cambio de sede vía header. */
  tenantId?: string;
  /** Tenant “casa” del usuario en Firestore (facturación / suscripción). */
  primaryTenantId?: string;
  /** IDs de otros tenants asociados (red multi-dealer). */
  associatedDealers?: string[];
  dealerId?: string;
}

/** Suscripción y membresía deben resolverse contra el tenant principal, no contra una sede asociada vista en contexto. */
export function billingTenantId(auth: AuthUser): string | undefined {
  return auth.primaryTenantId ?? auth.tenantId;
}

/**
 * Verifica autenticación y retorna usuario.
 * `tenantId` es el efectivo (header `X-Dealer-Tenant-Id` si está permitido).
 */
export async function verifyAuth(request: NextRequest): Promise<AuthUser | null> {
  try {
    let token: string | undefined;

    const authTokenCookie = request.cookies.get('authToken')?.value;
    if (authTokenCookie) {
      try {
        token = decodeURIComponent(authTokenCookie);
      } catch {
        token = authTokenCookie;
      }
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const headerToken = authHeader.replace('Bearer ', '').trim();
      if (headerToken && headerToken.length > 200) {
        token = headerToken;
      }
    }

    if (!token) {
      try {
        const cookieStore = await cookies();
        const cookieToken = cookieStore.get('authToken')?.value;
        if (cookieToken) {
          try {
            token = decodeURIComponent(cookieToken);
          } catch {
            token = cookieToken;
          }
        }
      } catch {
        // ignore
      }
    }

    if (!token) {
      return null;
    }

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (verifyError: unknown) {
      const code = (verifyError as { code?: string })?.code;
      if (code !== 'auth/id-token-expired') {
        console.error('❌ [verifyAuth] Error al verificar token:', code || verifyError);
      }
      return null;
    }

    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    const role = userData?.role as string | undefined;

    if (!isDealerPortalRole(role)) {
      return null;
    }

    const primaryTenantId = userData?.tenantId as string | undefined;
    const associatedDealers = (userData?.associatedDealers as string[] | undefined) ?? [];

    let effectiveTenantId = primaryTenantId;
    const requested = request.headers.get('x-dealer-tenant-id')?.trim();
    if (requested && primaryTenantId) {
      if (requested === primaryTenantId || associatedDealers.includes(requested)) {
        effectiveTenantId = requested;
      }
    }

    return {
      userId: decodedToken.uid,
      email: decodedToken.email || (userData?.email as string) || '',
      role: role || 'dealer',
      tenantId: effectiveTenantId,
      primaryTenantId,
      associatedDealers,
      dealerId: userData?.dealerId as string | undefined,
    };
  } catch (error: unknown) {
    console.error('❌ [verifyAuth] Error crítico:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Igual que verifyAuth pero permite rol `seller` (vendedores del portal dealer).
 * Usar solo en rutas pensadas para vendedores; el resto debe seguir con verifyAuth.
 */
export async function verifyAuthIncludingSeller(request: NextRequest): Promise<AuthUser | null> {
  try {
    let token: string | undefined;

    const authTokenCookie = request.cookies.get('authToken')?.value;
    if (authTokenCookie) {
      try {
        token = decodeURIComponent(authTokenCookie);
      } catch {
        token = authTokenCookie;
      }
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const headerToken = authHeader.replace('Bearer ', '').trim();
      if (headerToken && headerToken.length > 200) {
        token = headerToken;
      }
    }

    if (!token) {
      try {
        const cookieStore = await cookies();
        const cookieToken = cookieStore.get('authToken')?.value;
        if (cookieToken) {
          try {
            token = decodeURIComponent(cookieToken);
          } catch {
            token = cookieToken;
          }
        }
      } catch {
        // ignore
      }
    }

    if (!token) {
      return null;
    }

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (verifyError: unknown) {
      const code = (verifyError as { code?: string })?.code;
      if (code !== 'auth/id-token-expired') {
        console.error('❌ [verifyAuthIncludingSeller] Error al verificar token:', code || verifyError);
      }
      return null;
    }

    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    const role = userData?.role as string | undefined;

    if (!isDealerPortalRole(role) && !isSellerRole(role)) {
      return null;
    }

    const primaryTenantId = userData?.tenantId as string | undefined;
    const associatedDealers = (userData?.associatedDealers as string[] | undefined) ?? [];

    let effectiveTenantId = primaryTenantId;
    const requested = request.headers.get('x-dealer-tenant-id')?.trim();
    if (requested && primaryTenantId) {
      if (requested === primaryTenantId || associatedDealers.includes(requested)) {
        effectiveTenantId = requested;
      }
    }

    return {
      userId: decodedToken.uid,
      email: decodedToken.email || (userData?.email as string) || '',
      role: role || 'dealer',
      tenantId: effectiveTenantId,
      primaryTenantId,
      associatedDealers,
      dealerId: userData?.dealerId as string | undefined,
    };
  } catch (error: unknown) {
    console.error(
      '❌ [verifyAuthIncludingSeller] Error crítico:',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}
