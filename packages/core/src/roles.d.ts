import { UserRole } from './types';
export declare const ROLES: Record<UserRole, string>;
export declare const PERMISSIONS: Record<UserRole, {
    canManageUsers: boolean;
    canManageInventory: boolean;
    canManageLeads: boolean;
    canManageSellers: boolean;
    canAccessAdmin: boolean;
    canManageIntegrations: boolean;
    canManageMemberships: boolean;
    canManageDealers?: boolean;
    canApproveDealers?: boolean;
}>;
//# sourceMappingURL=roles.d.ts.map