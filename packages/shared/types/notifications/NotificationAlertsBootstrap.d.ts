interface NotificationAlertsBootstrapProps {
    /** Ruta API para registrar token FCM */
    fcmApiPath?: string;
    /** Registrar push FCM al montar */
    enablePush?: boolean;
}
/**

 * Inicializa permisos de notificación y registro FCM en dashboards.

 */
export declare function NotificationAlertsBootstrap({ fcmApiPath, enablePush, }: NotificationAlertsBootstrapProps): any;
export {};
