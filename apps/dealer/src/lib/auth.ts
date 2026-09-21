import { NextRequest } from 'next/server';
import { getAuth } from '@autodealers/core';
import { AUTH_PROFILE_COOKIE, resolveUsersProfileForAuthApp } from '@autodealers/core/app-passwords';
import { cookies } from 'next/headers';
import { DEALER_PORTAL_ROLES, canAccessDealerApp, isDealerPortalRole, isSellerRole } from './dealer-portal-roles';
import * as admin from 'firebase-admin';

const auth = getAuth();

export { DEALER_PORTAL_ROLES, canAccessDealerApp, isDealerPortalRole, isSellerRole };

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
  /** Tenants específicos que un empleado/admin puede operar. */
  tenantIds?: string[];
  permissions?: Record<string, boolean>;
  dealerId?: string;
  /** Sesión de soporte: admin de plataforma actuando como este usuario. */
  supportMode?: boolean;
  supportSessionId?: string;
  supportAdminId?: string;
  supportAdminEmail?: string;
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
      // Permitir cualquier token, incluyendo sessionIds del panel admin
      if (headerToken) {
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

    // Soporte primero (tokens pueden ser largos; no discriminar por longitud)
    try {
      const { tryParseSupportSessionToken, validateSupportSessionToken } = await import(
        '@autodealers/core'
      );
      if (tryParseSupportSessionToken(token)) {
        const validated = await validateSupportSessionToken(token);
        if (!validated) return null;
        const { session } = validated;
        if (session.portal !== 'dealer') return null;

        const { getFirestore } = await import('@autodealers/core');
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(session.targetUserId).get();
        if (!userDoc.exists) return null;
        const userData = userDoc.data();
        const role = (userData?.role as string) || session.targetRole;
        if (!canAccessDealerApp(role)) return null;

        const primaryTenantId =
          (userData?.tenantId as string | undefined) || session.targetTenantId;
        const associatedDealers = (userData?.associatedDealers as string[] | undefined) ?? [];
        const employeeTenantIds = (userData?.tenantIds as string[] | undefined) ?? [];

        return {
          userId: session.targetUserId,
          email: (userData?.email as string) || session.targetEmail || '',
          role: role || 'dealer',
          tenantId: primaryTenantId,
          primaryTenantId,
          associatedDealers,
          tenantIds: employeeTenantIds,
          permissions: (userData?.permissions as Record<string, boolean> | undefined) || undefined,
          dealerId: userData?.dealerId as string | undefined,
          supportMode: true,
          supportSessionId: session.id,
          supportAdminId: session.adminUserId,
          supportAdminEmail: session.adminEmail,
        };
      }
    } catch {
      /* continuar */
    }

    // Verificar si es un sessionId del panel admin (64 caracteres hex)
    const ADMIN_SESSION_RE = /^[a-f0-9]{64}$/i;
    if (ADMIN_SESSION_RE.test(token)) {
      try {
        const { getFirestore } = await import('@autodealers/core');
        const db = getFirestore();
        
        // Verificar la sesión en Firestore
        const sessionDoc = await db.collection('sessions').doc(token).get();
        
        if (!sessionDoc.exists) {
          console.warn('⚠️ Admin session no encontrada en dealer app');
          return null;
        }
        
        const sessionData = sessionDoc.data();
        
        // Verificar expiración
        if (sessionData?.expiresAt) {
          const expiresAt = sessionData.expiresAt.toDate();
          if (expiresAt < new Date()) {
            console.warn('⚠️ Admin session expirada en dealer app');
            await sessionDoc.ref.delete();
            return null;
          }
        }
        
        // Actualizar última actividad
        await sessionDoc.ref.update({
          lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        // Buscar usuario (admin o regular)
        const adminDoc = await db.collection('admin_users').doc(sessionData.userId).get();
        let userDoc;
        let userData;
        let role;
        
        if (adminDoc.exists) {
          const adminData = adminDoc.data();
          if (adminData?.isActive === false) {
            console.warn('⚠️ Admin inactivo en dealer app');
            return null;
          }
          userData = adminData;
          role = 'admin';
        } else {
          userDoc = await db.collection('users').doc(sessionData.userId).get();
          if (!userDoc.exists) {
            console.warn('⚠️ Usuario no encontrado en dealer app');
            return null;
          }
          userData = userDoc.data();
          role = userData?.role as string;
          
          if (userData?.status === 'suspended' || userData?.status === 'cancelled') {
            console.warn('⚠️ Usuario suspendido en dealer app');
            return null;
          }
        }
        
        // Verificar si el rol puede acceder al dealer app
        if (!canAccessDealerApp(role)) {
          console.warn('⚠️ Rol no tiene acceso al dealer app:', role);
          return null;
        }
        
        const primaryTenantId = userData?.tenantId as string | undefined;
        const associatedDealers = (userData?.associatedDealers as string[] | undefined) ?? [];
        const employeeTenantIds = (userData?.tenantIds as string[] | undefined) ?? [];
        
        return {
          userId: sessionData.userId,
          email: sessionData.email || userData?.email || '',
          role: role || 'dealer',
          tenantId: primaryTenantId,
          primaryTenantId,
          associatedDealers,
          tenantIds: employeeTenantIds,
          permissions: (userData?.permissions as Record<string, boolean> | undefined) || undefined,
          dealerId: userData?.dealerId as string | undefined,
          supportMode: role === 'admin', // Admins acceden en modo soporte
        };
      } catch (error: any) {
        console.error('❌ Error verificando admin session en dealer app:', error.message);
        return null;
      }
    }

    if (token.length < 200) {
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const sessionData = JSON.parse(decoded);

        if (sessionData.exp && sessionData.exp < Math.floor(Date.now() / 1000)) {
          return null;
        }

        const { getFirestore } = await import('@autodealers/core');
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(sessionData.uid).get();

        if (!userDoc.exists) {
          return null;
        }

        const userData = userDoc.data();
        const role = userData?.role as string | undefined;

        if (!canAccessDealerApp(role)) {
          return null;
        }

        const primaryTenantId = userData?.tenantId as string | undefined;
        const associatedDealers = (userData?.associatedDealers as string[] | undefined) ?? [];
        const employeeTenantIds = (userData?.tenantIds as string[] | undefined) ?? [];

        return {
          userId: sessionData.uid,
          email: (userData?.email as string) || '',
          role: role || 'dealer',
          tenantId: primaryTenantId,
          primaryTenantId,
          associatedDealers,
          tenantIds: employeeTenantIds,
          permissions: (userData?.permissions as Record<string, boolean> | undefined) || undefined,
          dealerId: userData?.dealerId as string | undefined,
        };
      } catch {
        return null;
      }
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
    const claimProfileId =
      typeof (decodedToken as { profileId?: unknown }).profileId === 'string'
        ? String((decodedToken as { profileId?: string }).profileId)
        : '';
    const cookieProfileId = request.cookies.get(AUTH_PROFILE_COOKIE)?.value || '';
    const profile = await resolveUsersProfileForAuthApp({
      appKey: 'dealer',
      authUid: decodedToken.uid,
      profileId: claimProfileId || cookieProfileId,
      email: decodedToken.email,
    });
    if (!profile) {
      return null;
    }
    const userDoc = await db.collection('users').doc(profile.userId).get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    const role = userData?.role as string | undefined;

    if (!canAccessDealerApp(role)) {
      return null;
    }

    const primaryTenantId = userData?.tenantId as string | undefined;
    const associatedDealers = (userData?.associatedDealers as string[] | undefined) ?? [];
    const employeeTenantIds = (userData?.tenantIds as string[] | undefined) ?? [];
    let networkTenantIds: string[] = [];
    const dealerNetworkId = userData?.dealerNetworkId as string | undefined;
    if (dealerNetworkId) {
      try {
        const networkDoc = await db.collection('dealer_networks').doc(dealerNetworkId).get();
        const roster = networkDoc.data()?.dealers;
        if (Array.isArray(roster)) {
          networkTenantIds = roster
            .map((item: { tenantId?: unknown; status?: unknown }) =>
              typeof item.tenantId === 'string' && item.status !== 'pending_tenant_link'
                ? item.tenantId
                : ''
            )
            .filter(Boolean);
        }
      } catch {
        networkTenantIds = [];
      }
    }

    let effectiveTenantId = primaryTenantId;
    const requested = request.headers.get('x-dealer-tenant-id')?.trim();
    if (requested && primaryTenantId) {
      if (
        requested === primaryTenantId ||
        associatedDealers.includes(requested) ||
        employeeTenantIds.includes(requested) ||
        networkTenantIds.includes(requested)
      ) {
        effectiveTenantId = requested;
      }
    }

    return {
      userId: profile.userId,
      email: decodedToken.email || (userData?.email as string) || '',
      role: role || 'dealer',
      tenantId: effectiveTenantId,
      primaryTenantId,
      associatedDealers: Array.from(new Set([...associatedDealers, ...networkTenantIds])),
      tenantIds: employeeTenantIds,
      permissions: (userData?.permissions as Record<string, boolean> | undefined) || undefined,
      dealerId: userData?.dealerId as string | undefined,
    };
  } catch (error: unknown) {
    console.error('❌ [verifyAuth] Error crítico:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Alias de verifyAuth (vendedores ya pueden autenticarse en rutas del portal dealer).
 */
export async function verifyAuthIncludingSeller(request: NextRequest): Promise<AuthUser | null> {
  return verifyAuth(request);
}
