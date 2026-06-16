// Registro y envío de notificaciones push (FCM)

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

function getDb() {
  return getFirestore();
}

export interface FcmTokenRecord {
  token: string;
  platform: 'web' | 'android' | 'ios' | 'unknown';
  userAgent?: string;
  updatedAt: Date;
}

/**
 * Registra o actualiza un token FCM del usuario.
 */
export async function registerFcmToken(
  userId: string,
  token: string,
  options?: { platform?: FcmTokenRecord['platform']; userAgent?: string }
): Promise<void> {
  if (!userId || !token?.trim()) {
    return;
  }
  const trimmed = token.trim();
  const tokenId = Buffer.from(trimmed).toString('base64url').slice(0, 128);
  await getDb()
    .collection('users')
    .doc(userId)
    .collection('fcmTokens')
    .doc(tokenId)
    .set(
      {
        token: trimmed,
        platform: options?.platform || 'web',
        userAgent: options?.userAgent || null,
        updatedAt: getFirestoreFieldValue().serverTimestamp(),
      },
      { merge: true }
    );
}

/**
 * Elimina un token FCM (logout o permiso revocado).
 */
export async function unregisterFcmToken(userId: string, token: string): Promise<void> {
  if (!userId || !token?.trim()) {
    return;
  }
  const tokenId = Buffer.from(token.trim()).toString('base64url').slice(0, 128);
  await getDb().collection('users').doc(userId).collection('fcmTokens').doc(tokenId).delete();
}

/**
 * Obtiene tokens FCM activos del usuario.
 */
export async function getUserFcmTokens(userId: string): Promise<string[]> {
  const snapshot = await getDb()
    .collection('users')
    .doc(userId)
    .collection('fcmTokens')
    .limit(50)
    .get();

  const tokens: string[] = [];
  snapshot.docs.forEach((doc) => {
    const t = doc.data()?.token;
    if (typeof t === 'string' && t.length > 0) {
      tokens.push(t);
    }
  });
  return [...new Set(tokens)];
}

/**
 * Envía notificación push vía Firebase Cloud Messaging.
 */
export async function sendPushToUser(
  userId: string,
  payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }
): Promise<void> {
  const tokens = await getUserFcmTokens(userId);
  if (tokens.length === 0) {
    return;
  }

  try {
    const admin = require('firebase-admin') as typeof import('firebase-admin');
    const messaging = admin.messaging();

    const message: import('firebase-admin/messaging').MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      webpush: {
        fcmOptions: { link: payload.data?.route || '/' },
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/favicon.ico',
        },
      },
    };

    const result = await messaging.sendEachForMulticast(message);

    if (result.failureCount > 0) {
      const stale: string[] = [];
      result.responses.forEach((resp, i) => {
        if (
          !resp.success &&
          (resp.error?.code === 'messaging/registration-token-not-registered' ||
            resp.error?.code === 'messaging/invalid-registration-token')
        ) {
          stale.push(tokens[i]);
        }
      });
      await Promise.all(stale.map((t) => unregisterFcmToken(userId, t)));
    }
  } catch (error) {
    console.error('Error sending FCM push:', error);
  }
}
