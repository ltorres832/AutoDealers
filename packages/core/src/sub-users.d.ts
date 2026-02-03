export interface SubUser {
    id: string;
    tenantId: string;
    createdBy: string;
    email: string;
    name: string;
    phone?: string;
    role: 'manager' | 'assistant' | 'viewer';
    permissions: {
        canManageLeads: boolean;
        canManageInventory: boolean;
        canManageCampaigns: boolean;
        canManageMessages: boolean;
        canViewReports: boolean;
        canManageSettings: boolean;
    };
    isActive: boolean;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Crea un usuario subordinado
 * Si createOwnTenant es true, crea un tenant propio con subdominio
 */
export declare function createSubUser(tenantId: string, createdBy: string, subUserData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: SubUser['role'];
    permissions: Partial<SubUser['permissions']>;
    createOwnTenant?: boolean;
    subdomain?: string;
}): Promise<SubUser>;
/**
 * Obtiene usuarios subordinados de un tenant
 */
export declare function getSubUsers(tenantId: string, createdBy?: string): Promise<SubUser[]>;
/**
 * Activa/desactiva un usuario subordinado
 */
export declare function toggleSubUserStatus(tenantId: string, subUserId: string, isActive: boolean): Promise<void>;
/**
 * Actualiza permisos de un usuario subordinado
 */
export declare function updateSubUserPermissions(tenantId: string, subUserId: string, permissions: Partial<SubUser['permissions']>): Promise<void>;
//# sourceMappingURL=sub-users.d.ts.map