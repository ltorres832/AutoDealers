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
export declare function hasRole(context: AuthContext, role: UserRole): boolean;
/**
 * Verifica si un usuario tiene acceso a un tenant
 */
export declare function hasTenantAccess(context: AuthContext, tenantId: string): boolean;
/**
 * Verifica si un dealer puede acceder a un vendedor
 */
export declare function canAccessSeller(context: AuthContext, sellerTenantId: string, sellerDealerId?: string): boolean;
//# sourceMappingURL=auth.d.ts.map