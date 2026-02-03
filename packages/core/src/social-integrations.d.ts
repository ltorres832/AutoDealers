export type SocialPlatform = 'facebook' | 'instagram' | 'whatsapp' | 'tiktok';
export interface SocialIntegration {
    id: string;
    tenantId: string;
    platform: SocialPlatform;
    accountId: string;
    accountName: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    status: 'active' | 'inactive' | 'expired' | 'error';
    permissions: string[];
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Crea una integración de red social
 */
export declare function createSocialIntegration(integration: Omit<SocialIntegration, 'id' | 'createdAt' | 'updatedAt'>): Promise<SocialIntegration>;
/**
 * Obtiene integraciones de un tenant
 */
export declare function getSocialIntegrations(tenantId: string, platform?: SocialPlatform): Promise<SocialIntegration[]>;
/**
 * Actualiza una integración
 */
export declare function updateSocialIntegration(tenantId: string, integrationId: string, updates: Partial<SocialIntegration>): Promise<void>;
/**
 * Desactiva una integración
 */
export declare function deactivateSocialIntegration(tenantId: string, integrationId: string): Promise<void>;
//# sourceMappingURL=social-integrations.d.ts.map