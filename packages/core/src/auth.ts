// Autenticación y autorización

import { UserRole } from './types';

export interface AuthContext {
  userId: string;
  role: UserRole;
  tenantId?: string;
  dealerId?: string;
}

/**
 * Verifica si un usuario tiene un rol específico
 */
export function hasRole(context: AuthContext, role: UserRole): boolean {
  return context.role === role;
}

/**
 * Verifica si un usuario tiene acceso a un tenant
 */
export function hasTenantAccess(
  context: AuthContext,
  tenantId: string
): boolean {
  // Admin tiene acceso a todos
  if (context.role === 'admin') {
    return true;
  }

  // Dealer/Seller solo a su propio tenant
  return context.tenantId === tenantId;
}

/**
 * Verifica si un dealer puede acceder a un vendedor
 */
export function canAccessSeller(
  context: AuthContext,
  sellerTenantId: string,
  sellerDealerId?: string
): boolean {
  if (context.role === 'admin') {
    return true;
  }

  if (context.role === 'dealer' && context.tenantId) {
    return sellerDealerId === context.tenantId;
  }

  return false;
}





