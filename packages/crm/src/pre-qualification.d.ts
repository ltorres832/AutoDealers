import { PreQualification, PreQualificationStatus } from './types';
/**
 * Crea una nueva pre-cualificación
 */
export declare function createPreQualification(tenantId: string, data: Omit<PreQualification, 'id' | 'createdAt' | 'expiresAt' | 'result'>): Promise<PreQualification>;
/**
 * Obtiene una pre-cualificación por ID
 */
export declare function getPreQualificationById(tenantId: string, preQualificationId: string): Promise<PreQualification | null>;
/**
 * Obtiene pre-cualificaciones por tenant
 */
export declare function getPreQualifications(tenantId: string, filters?: {
    status?: PreQualificationStatus;
    limit?: number;
}): Promise<PreQualification[]>;
//# sourceMappingURL=pre-qualification.d.ts.map