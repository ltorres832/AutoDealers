/**
 * Sincroniza las features de una membresía con todos los tenants que la usan
 * Se ejecuta automáticamente cuando se actualiza una membresía
 */
export declare function syncMembershipFeaturesToTenants(membershipId: string): Promise<void>;
/**
 * Obtiene las features desde caché (más rápido) o desde la membresía
 */
export declare function getTenantFeaturesCached(tenantId: string): Promise<any>;
/**
 * Listener para sincronización automática cuando se actualiza una membresía
 * Se puede configurar como Cloud Function o ejecutar manualmente
 */
export declare function setupMembershipSyncListener(): Promise<void>;
//# sourceMappingURL=feature-sync.d.ts.map