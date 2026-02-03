export interface MaintenanceMode {
    enabled: boolean;
    message: string;
    scheduledStart?: Date;
    scheduledEnd?: Date;
    currentStart?: Date;
    currentEnd?: Date;
    affectedDashboards: ('admin' | 'dealer' | 'seller' | 'public')[];
    createdAt?: Date;
    updatedAt?: Date;
}
/**
 * Obtiene el estado actual del modo de mantenimiento
 */
export declare function getMaintenanceMode(): Promise<MaintenanceMode | null>;
/**
 * Verifica si el modo de mantenimiento está activo
 */
export declare function isMaintenanceModeActive(): Promise<boolean>;
/**
 * Actualiza el modo de mantenimiento
 */
export declare function updateMaintenanceMode(mode: Partial<MaintenanceMode>): Promise<MaintenanceMode>;
//# sourceMappingURL=maintenance.d.ts.map