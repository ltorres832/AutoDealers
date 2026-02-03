import { DealerAdminUser, DealerAdminPermissions, UserStatus } from './types';
/**
 * Crea un nuevo usuario administrador de dealer(s)
 */
export declare function createDealerAdminUser(email: string, password: string, name: string, tenantIds: string[], // Array de tenant IDs que puede administrar
dealerId: string, // ID del dealer que lo crea
permissions: Partial<DealerAdminPermissions>, createdBy: string): Promise<DealerAdminUser>;
/**
 * Obtiene todos los usuarios administradores de un dealer
 */
export declare function getDealerAdminUsers(dealerId?: string): Promise<DealerAdminUser[]>;
/**
 * Obtiene un usuario administrador de dealer por ID
 */
export declare function getDealerAdminUserById(userId: string): Promise<DealerAdminUser | null>;
/**
 * Actualiza los tenants que puede administrar un usuario
 */
export declare function updateDealerAdminTenants(userId: string, tenantIds: string[]): Promise<void>;
/**
 * Actualiza los permisos de un usuario administrador de dealer
 */
export declare function updateDealerAdminPermissions(userId: string, permissions: Partial<DealerAdminPermissions>): Promise<void>;
/**
 * Cambia el estado de un usuario administrador de dealer
 */
export declare function updateDealerAdminStatus(userId: string, status: UserStatus): Promise<void>;
/**
 * Elimina un usuario administrador de dealer
 */
export declare function deleteDealerAdminUser(userId: string): Promise<void>;
/**
 * Crea un usuario que tiene identidades múltiples (vendedor + admin)
 * Si un vendedor también será admin del dealer, se crean credenciales separadas
 */
export declare function createMultiIdentityUser(email: string, passwordSeller: string, // Password para identidad de vendedor
passwordAdmin: string, // Password para identidad de admin (puede ser diferente)
name: string, sellerData: {
    tenantId: string;
    dealerId?: string;
}, adminData: {
    tenantIds: string[];
    dealerId: string;
    permissions: Partial<DealerAdminPermissions>;
}, createdBy: string): Promise<{
    sellerUserId: string;
    adminUserId: string;
}>;
//# sourceMappingURL=dealer-admin-users.d.ts.map