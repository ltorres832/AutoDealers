/**
 * Funciones para verificar y gestionar acceso Multi Dealer
 * El acceso es válido por 48 horas después de la aprobación
 */
export interface MultiDealerAccess {
    hasAccess: boolean;
    approvedUntil?: Date;
    hoursRemaining?: number;
    isExpired: boolean;
}
/**
 * Verifica si un usuario tiene acceso activo a membresías Multi Dealer
 * El acceso es válido por 48 horas después de la aprobación
 */
export declare function checkMultiDealerAccess(userId: string): Promise<MultiDealerAccess>;
/**
 * Verifica si un usuario puede ver una membresía Multi Dealer específica
 */
export declare function canViewMultiDealerMembership(userId: string, membershipId: string): Promise<boolean>;
//# sourceMappingURL=multi-dealer-access.d.ts.map