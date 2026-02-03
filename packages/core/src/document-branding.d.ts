export interface DocumentBrandingConfig {
    tenantId: string;
    userId?: string;
    showPlatformLogo: boolean;
    showDealerLogo: boolean;
    showSellerLogo: boolean;
    showPlatformName: boolean;
    showDealerName: boolean;
    showSellerName: boolean;
    logoOrder: {
        platform: number;
        dealer: number;
        seller: number;
    };
    nameOrder: {
        platform: number;
        dealer: number;
        seller: number;
    };
    platformLogoUrl?: string;
    dealerLogoUrl?: string;
    sellerLogoUrl?: string;
    platformName?: string;
    dealerName?: string;
    sellerName?: string;
    documentTypes: {
        certificate?: DocumentTypeConfig;
        contract?: DocumentTypeConfig;
        invoice?: DocumentTypeConfig;
        receipt?: DocumentTypeConfig;
        [key: string]: DocumentTypeConfig | undefined;
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface DocumentTypeConfig {
    showPlatformLogo: boolean;
    showDealerLogo: boolean;
    showSellerLogo: boolean;
    showPlatformName: boolean;
    showDealerName: boolean;
    showSellerName: boolean;
    logoOrder?: {
        platform: number;
        dealer: number;
        seller: number;
    };
    nameOrder?: {
        platform: number;
        dealer: number;
        seller: number;
    };
}
/**
 * Obtiene la configuración de branding para un tenant/usuario
 */
export declare function getDocumentBrandingConfig(tenantId: string, userId?: string): Promise<DocumentBrandingConfig | null>;
/**
 * Crea o actualiza la configuración de branding
 */
export declare function setDocumentBrandingConfig(config: Partial<DocumentBrandingConfig> & {
    tenantId: string;
}): Promise<DocumentBrandingConfig>;
/**
 * Obtiene la configuración efectiva para un tipo de documento específico
 */
export declare function getDocumentTypeBranding(tenantId: string, documentType: string, userId?: string): Promise<DocumentTypeConfig>;
/**
 * Obtiene los logos y nombres ordenados según la configuración
 */
export declare function getOrderedBrandingElements(tenantId: string, documentType: string, userId?: string): Promise<{
    logos: Array<{
        type: 'platform' | 'dealer' | 'seller';
        url?: string;
        name?: string;
    }>;
    names: Array<{
        type: 'platform' | 'dealer' | 'seller';
        text: string;
    }>;
}>;
//# sourceMappingURL=document-branding.d.ts.map