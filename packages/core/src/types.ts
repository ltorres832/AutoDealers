// Tipos base del sistema

export type UserRole = 'admin' | 'master_dealer' | 'dealer' | 'seller' | 'advertiser' | 'manager' | 'dealer_admin';

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
  phone?: string; // Número de teléfono para notificaciones SMS y WhatsApp
  settings: Record<string, any>;
  // Email corporativo (legacy - para compatibilidad)
  corporateEmail?: string; // Email corporativo asignado (ej: juan@autocity.autoplataforma.com)
  emailSignature?: string; // Firma de email (HTML)
  emailSignatureType?: 'basic' | 'advanced'; // Tipo de firma según membresía
  // Sistema de aliases (según documento final)
  emailAliases?: number; // Número de aliases permitidos según membresía
}

export interface Tenant {
  id: string;
  name: string;
  type: TenantType;
  companyName?: string; // Nombre de la compañía (solo para dealers, para identificar múltiples dealers de la misma compañía)
  subdomain?: string;
  domain?: string;
  membershipId?: string;
  status?: 'active' | 'suspended' | 'cancelled' | 'pending';
  approvedByAdmin?: boolean; // Si el dealer/vendedor ha sido aprobado por admin (requerido para master_dealer y membresías especiales)
  fiManagerId?: string; // ID del usuario designado como Gerente F&I (solo para dealers)
  fiManagerPhone?: string; // Teléfono del gerente F&I para notificaciones SMS
  fiManagerEmail?: string; // Email del gerente F&I para notificaciones
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
  // Emails corporativos (para dealers)
  corporateEmailsUsed?: number; // Cantidad de emails corporativos usados
  corporateEmailDomain?: string; // Dominio base (ej: autocity.autoplataforma.com)
  // Sistema de aliases (según documento final)
  emailAliases?: number; // Número de aliases permitidos según membresía
  aliasesUsed?: number; // Cantidad de aliases usados
}

// Permisos para usuarios administradores
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
  canManageUsers: boolean; // Para crear otros admin users del dealer
}

// Usuario administrador del sistema (sub-admin del admin supremo)
export interface AdminUserType {
  id: string;
  email: string;
  name: string;
  role: 'admin_user'; // Rol especial para usuarios admin
  permissions: AdminPermissions;
  createdBy: string; // ID del admin que lo creó
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

// Usuario administrador de un dealer (puede administrar uno o múltiples dealers)
export interface DealerAdminUser {
  id: string;
  email: string;
  name: string;
  role: 'dealer_admin';
  tenantIds: string[]; // Array de tenant IDs que puede administrar
  dealerId?: string; // Si pertenece a un dealer principal
  permissions: DealerAdminPermissions;
  createdBy: string; // ID del dealer/admin que lo creó
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

// Usuario que puede tener múltiples identidades (vendedor + admin)
export interface MultiIdentityUser {
  userId: string; // ID único del usuario
  email: string; // Email principal
  name: string;
  identities: {
    seller?: {
      tenantId: string;
      dealerId?: string;
      sellerId: string; // ID específico como vendedor
    };
    dealerAdmin?: {
      tenantIds: string[];
      dealerId?: string;
      adminId: string; // ID específico como admin
      permissions: DealerAdminPermissions;
    };
  };
}

