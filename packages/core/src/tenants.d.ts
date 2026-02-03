import { Tenant, TenantType } from './types';
/**
 * Crea un nuevo tenant
 */
export declare function createTenant(name: string, type: TenantType, subdomain?: string, membershipId?: string, companyName?: string): Promise<Tenant>;
/**
 * Obtiene un tenant por ID
 */
export declare function getTenantById(tenantId: string): Promise<Tenant | null>;
/**
 * Obtiene un tenant por subdominio (solo activos)
 */
export declare function getTenantBySubdomain(subdomain: string): Promise<Tenant | null>;
/**
 * Obtiene todos los tenants (solo para admin)
 */
export declare function getTenants(): Promise<Tenant[]>;
/**
 * Actualiza un tenant
 */
export declare function updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<void>;
/**
 * Obtiene el tenantId por número de WhatsApp (busca en integraciones)
 */
export declare function getTenantByWhatsAppNumber(phoneNumberId: string): Promise<string | null>;
//# sourceMappingURL=tenants.d.ts.map