'use client';

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, type Messaging } from 'firebase/messaging';
import { getFirebaseWebClientConfig } from '../firebase-web-client-config';
import { requestBrowserNotificationPermission } from './notification-alerts';

let messagingInstance: Messaging | null = null;

function getOrInitApp(): FirebaseApp {
  const config = getFirebaseWebClientConfig();
  if (getApps().length === 0) {
    return initializeApp(config);
  }
  return getApps()[0];
}

/**
 * Registra token FCM web y lo envía al backend.
 */
export async function registerWebPushToken(apiPath = '/api/notifications/fcm-token'): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const supported = await isSupported();
  if (!supported) return null;

  await requestBrowserNotificationPermission();

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  if (!vapidKey) {
    console.warn('[push] NEXT_PUBLIC_FIREBASE_VAPID_KEY no configurada');
    return null;
  }

  try {
    const app = getOrInitApp();
    messagingInstance = getMessaging(app);

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });

    const token = await getToken(messagingInstance, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) return null;

    await fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        token,
        platform: 'web',
        userAgent: navigator.userAgent,
      }),
    });

    return token;
  } catch (error) {
    console.warn('[push] No se pudo registrar FCM:', error);
    return null;
  }
}

/** Elimina token FCM del backend al cerrar sesión. */
export async function unregisterWebPushToken(apiPath = '/api/notifications/fcm-token'): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const supported = await isSupported();
    if (!supported) return;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
    if (!vapidKey) return;

    const app = getOrInitApp();
    messagingInstance = getMessaging(app);
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (!registration) return;

    const token = await getToken(messagingInstance, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) return;

    await fetch(apiPath, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
  } catch (error) {
    console.warn('[push] No se pudo desregistrar FCM:', error);
  }
}
