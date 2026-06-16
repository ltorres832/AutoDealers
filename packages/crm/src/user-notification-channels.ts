import { getNotificationChannelsForUser } from '@autodealers/core';

/** Canales según preferencias del usuario (incluye push). */
export async function resolveUserNotificationChannels(userId: string) {
  return getNotificationChannelsForUser(userId);
}
