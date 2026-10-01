/**
 * Registra token FCM web y lo envía al backend.
 */
export declare function registerWebPushToken(apiPath?: string): Promise<string | null>;
/** Elimina token FCM del backend al cerrar sesión. */
export declare function unregisterWebPushToken(apiPath?: string): Promise<void>;
