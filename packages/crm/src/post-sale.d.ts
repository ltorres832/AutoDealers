export type ReminderType = 'oil_change' | 'filter' | 'oil_change_filter' | 'tire_rotation' | 'custom';
export type ReminderFrequency = 'monthly' | '3_months' | '5_months' | '6_months' | 'manual';
export interface PostSaleReminder {
    id: string;
    tenantId: string;
    saleId: string;
    customerId: string;
    vehicleId: string;
    type: ReminderType;
    customType?: string;
    frequency: ReminderFrequency;
    nextReminder: Date;
    channels: ('email' | 'sms' | 'whatsapp')[];
    status: 'active' | 'completed' | 'cancelled';
    sentAt?: Date;
    createdAt: Date;
}
/**
 * Crea un recordatorio individual
 */
export declare function createReminder(reminderData: Omit<PostSaleReminder, 'id' | 'createdAt'>): Promise<PostSaleReminder>;
/**
 * Crea recordatorios post-venta automáticamente
 */
export declare function createPostSaleReminders(tenantId: string, saleId: string, customerId: string, vehicleId: string, selectedReminders?: (ReminderType | 'oil_change_filter' | 'oil_change_filter_3' | 'oil_change_filter_5' | 'oil_change_filter_6')[]): Promise<PostSaleReminder[]>;
/**
 * Obtiene todos los recordatorios (activos y completados)
 */
export declare function getAllReminders(tenantId: string, filters?: {
    status?: 'active' | 'completed' | 'cancelled';
    startDate?: Date;
    endDate?: Date;
}): Promise<PostSaleReminder[]>;
/**
 * Obtiene recordatorios pendientes
 */
export declare function getPendingReminders(tenantId: string, beforeDate?: Date): Promise<PostSaleReminder[]>;
/**
 * Marca un recordatorio como enviado
 */
export declare function markReminderAsSent(tenantId: string, reminderId: string): Promise<void>;
//# sourceMappingURL=post-sale.d.ts.map