'use client';



import { useEffect } from 'react';

import { registerWebPushToken } from './register-web-push';

import { requestBrowserNotificationPermission } from './notification-alerts';



interface NotificationAlertsBootstrapProps {

  /** Ruta API para registrar token FCM */

  fcmApiPath?: string;

  /** Registrar push FCM al montar */

  enablePush?: boolean;

}



/**

 * Inicializa permisos de notificación y registro FCM en dashboards.

 */

export function NotificationAlertsBootstrap({

  fcmApiPath = '/api/notifications/fcm-token',

  enablePush = true,

}: NotificationAlertsBootstrapProps) {

  useEffect(() => {

    let cancelled = false;



    const attemptRegister = async () => {

      if (cancelled || !enablePush) return;

      await requestBrowserNotificationPermission();

      const token = await registerWebPushToken(fcmApiPath);

      if (!token && !cancelled && typeof Notification !== 'undefined') {

        if (Notification.permission === 'granted') {

          setTimeout(() => {

            if (!cancelled) void registerWebPushToken(fcmApiPath);

          }, 5000);

        }

      }

    };



    void attemptRegister();



    const onVisible = () => {

      if (document.visibilityState === 'visible') {

        void attemptRegister();

      }

    };



    document.addEventListener('visibilitychange', onVisible);



    return () => {

      cancelled = true;

      document.removeEventListener('visibilitychange', onVisible);

    };

  }, [fcmApiPath, enablePush]);



  return null;

}

