/** Sonido corto en base64 (mismo tono usado en chat interno). */
export declare const NOTIFICATION_SOUND_DATA_URI = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzGFzvLZkDkIHmS58OSbUQ4PVKzn77FdGAg=";
/**
 * Reproduce sonido de notificación (respeta preferencia en localStorage).
 */
export declare function playNotificationSound(): void;
export interface BrowserNotificationPayload {
    title: string;
    body: string;
    tag?: string;
    route?: string;
}
export declare function resolveNotificationRoute(metadata?: Record<string, unknown> | null): string | undefined;
/**
 * Muestra notificación nativa del navegador si hay permiso.
 */
export declare function showBrowserNotification(payload: BrowserNotificationPayload): void;
/**
 * Solicita permiso para notificaciones del navegador.
 */
export declare function requestBrowserNotificationPermission(): Promise<NotificationPermission>;
