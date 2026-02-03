/**
 * Verifica y envía notificaciones para nuevas versiones de políticas requeridas
 */
export declare function checkAndNotifyPolicyUpdates(userId: string, role: 'admin' | 'dealer' | 'seller' | 'public' | 'advertiser', tenantId?: string): Promise<void>;
/**
 * Envía notificación cuando se crea o actualiza una política requerida
 */
export declare function notifyPolicyUpdate(policyId: string, policyTitle: string, policyVersion: string, applicableRoles: ('admin' | 'dealer' | 'seller' | 'public' | 'advertiser')[], tenantId?: string): Promise<void>;
//# sourceMappingURL=policy-notifications.d.ts.map