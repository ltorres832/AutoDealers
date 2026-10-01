export interface AlertableNotification {
    id: string;
    title: string;
    message: string;
    read?: boolean;
    type?: string;
    metadata?: Record<string, unknown>;
}
/**
 * Detecta notificaciones nuevas no leídas y dispara sonido + alerta del navegador.
 */
export declare function useNotificationAlerts(notifications: AlertableNotification[], enabled?: boolean): void;
