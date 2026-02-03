export type NotificationType = 'lead_created' | 'lead_assigned' | 'message_received' | 'appointment_created' | 'appointment_reminder' | 'sale_completed' | 'reminder_due' | 'payment_failed' | 'system_alert';
export type NotificationChannel = 'system' | 'email' | 'sms' | 'whatsapp';
export interface Notification {
    id: string;
    tenantId: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    channels: NotificationChannel[];
    read: boolean;
    metadata?: Record<string, any>;
    createdAt: Date;
    readAt?: Date;
}
/**
 * Crea una notificación
 */
export declare function createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification>;
/**
 * Obtiene notificaciones de un usuario
 */
export declare function getUserNotifications(tenantId: string, userId: string, options?: {
    unreadOnly?: boolean;
    limit?: number;
}): Promise<Notification[]>;
/**
 * Marca una notificación como leída
 */
export declare function markNotificationAsRead(tenantId: string, notificationId: string): Promise<void>;
/**
 * Marca todas las notificaciones como leídas
 */
export declare function markAllNotificationsAsRead(tenantId: string, userId: string): Promise<void>;
//# sourceMappingURL=notifications.d.ts.map