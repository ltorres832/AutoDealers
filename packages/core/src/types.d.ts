export type UserRole = 'admin' | 'master_dealer' | 'dealer' | 'seller' | 'advertiser';
export type TenantType = 'dealer' | 'seller';
export type UserStatus = 'active' | 'suspended' | 'cancelled';
export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    tenantId?: string;
    dealerId?: string;
    membershipId: string;
    membershipType: TenantType;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date;
    phone?: string;
    settings: Record<string, any>;
    corporateEmail?: string;
    emailSignature?: string;
    emailSignatureType?: 'basic' | 'advanced';
    emailAliases?: number;
}
export interface Tenant {
    id: string;
    name: string;
    type: TenantType;
    companyName?: string;
    subdomain?: string;
    domain?: string;
    membershipId?: string;
    status?: 'active' | 'suspended' | 'cancelled' | 'pending';
    approvedByAdmin?: boolean;
    fiManagerId?: string;
    fiManagerPhone?: string;
    fiManagerEmail?: string;
    branding: {
        logo?: string;
        logoUrl?: string;
        favicon?: string;
        faviconUrl?: string;
        primaryColor: string;
        secondaryColor: string;
    };
    settings: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    corporateEmailsUsed?: number;
    corporateEmailDomain?: string;
    emailAliases?: number;
    aliasesUsed?: number;
}
export interface AdminPermissions {
    canManageUsers: boolean;
    canManageTenants: boolean;
    canManageMemberships: boolean;
    canManageSettings: boolean;
    canManageIntegrations: boolean;
    canViewReports: boolean;
    canManageLogs: boolean;
    canManageBranding: boolean;
}
export interface DealerAdminPermissions {
    canManageInventory: boolean;
    canManageLeads: boolean;
    canManageSellers: boolean;
    canManageCampaigns: boolean;
    canManagePromotions: boolean;
    canManageSettings: boolean;
    canManageIntegrations: boolean;
    canViewReports: boolean;
    canManageUsers: boolean;
}
export interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: 'admin_user';
    permissions: AdminPermissions;
    createdBy: string;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date;
}
export interface DealerAdminUser {
    id: string;
    email: string;
    name: string;
    role: 'dealer_admin';
    tenantIds: string[];
    dealerId?: string;
    permissions: DealerAdminPermissions;
    createdBy: string;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date;
}
export interface MultiIdentityUser {
    userId: string;
    email: string;
    name: string;
    identities: {
        seller?: {
            tenantId: string;
            dealerId?: string;
            sellerId: string;
        };
        dealerAdmin?: {
            tenantIds: string[];
            dealerId?: string;
            adminId: string;
            permissions: DealerAdminPermissions;
        };
    };
}
//# sourceMappingURL=types.d.ts.map