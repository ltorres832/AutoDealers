import { TemplateType, TemplateEvent } from './communication-templates';
export interface CommunicationLog {
    id: string;
    templateId: string;
    templateName: string;
    event: TemplateEvent;
    type: TemplateType;
    recipientId: string;
    recipientEmail: string;
    recipientName: string;
    tenantId: string;
    tenantName: string;
    status: 'success' | 'failed';
    messageId?: string;
    error?: string;
    sentAt: Date;
    metadata?: Record<string, any>;
}
/**
 * Registra un envío de comunicación
 */
export declare function logCommunication(data: {
    templateId: string;
    templateName: string;
    event: TemplateEvent;
    type: TemplateType;
    recipientId: string;
    recipientEmail: string;
    recipientName: string;
    tenantId: string;
    tenantName: string;
    status: 'success' | 'failed';
    messageId?: string;
    error?: string;
    metadata?: Record<string, any>;
}): Promise<string>;
/**
 * Obtiene logs con filtros
 */
export declare function getCommunicationLogs(filters?: {
    tenantId?: string;
    type?: TemplateType;
    event?: TemplateEvent;
    status?: 'success' | 'failed';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
}): Promise<CommunicationLog[]>;
/**
 * Obtiene estadísticas de comunicaciones
 */
export declare function getCommunicationStats(filters?: {
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
}): Promise<{
    total: number;
    success: number;
    failed: number;
    byType: Record<TemplateType, number>;
    byEvent: Record<TemplateEvent, number>;
}>;
/**
 * Notifica al admin cuando se crea un nuevo template
 */
export declare function notifyAdminTemplateCreated(data: {
    templateId: string;
    templateName: string;
    type: TemplateType;
    event: TemplateEvent;
    createdBy: string;
}): Promise<void>;
//# sourceMappingURL=communication-logs.d.ts.map