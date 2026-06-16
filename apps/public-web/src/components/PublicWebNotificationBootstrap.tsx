'use client';

import { NotificationAlertsBootstrap } from '@autodealers/shared/client';

/**
 * Registra FCM para usuarios autenticados en public-web (referidos, registro, etc.).
 * Visitantes anónimos: el API responde 401 y no se registra token.
 */
export function PublicWebNotificationBootstrap() {
  return (
    <NotificationAlertsBootstrap
      fcmApiPath="/api/notifications/fcm-token"
      enablePush
    />
  );
}
