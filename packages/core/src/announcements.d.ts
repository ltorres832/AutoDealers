export interface GlobalAnnouncement {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    targetDashboards: ('admin' | 'dealer' | 'seller' | 'public')[];
    targetRoles?: ('admin' | 'dealer' | 'seller' | 'advertiser')[];
    targetTenants?: string[];
    startDate?: Date;
    endDate?: Date;
    isActive: boolean;
    showDismissButton: boolean;
    actionUrl?: string;
    actionText?: string;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    dismissedBy?: string[];
}
/**
 * Crea un nuevo anuncio global
 */
export declare function createGlobalAnnouncement(announcement: Omit<GlobalAnnouncement, 'id' | 'createdAt' | 'updatedAt' | 'dismissedBy'>, sendNotifications?: boolean): Promise<GlobalAnnouncement>;
/**
 * Obtiene anuncios activos para un dashboard específico
 */
export declare function getActiveAnnouncements(dashboard: 'admin' | 'dealer' | 'seller' | 'public', userId?: string, tenantId?: string): Promise<GlobalAnnouncement[]>;
/**
 * Marca un anuncio como descartado por un usuario
 */
export declare function dismissAnnouncement(announcementId: string, userId: string): Promise<void>;
/**
 * Obtiene todos los anuncios (para admin)
 */
export declare function getAllAnnouncements(): Promise<GlobalAnnouncement[]>;
/**
 * Actualiza un anuncio
 */
export declare function updateGlobalAnnouncement(announcementId: string, updates: Partial<GlobalAnnouncement>): Promise<GlobalAnnouncement>;
/**
 * Elimina un anuncio
 */
export declare function deleteGlobalAnnouncement(announcementId: string): Promise<void>;
//# sourceMappingURL=announcements.d.ts.map