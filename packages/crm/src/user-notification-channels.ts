import { getFirestore } from '@autodealers/shared';

/** Misma lógica que en core/notifications para vendedores y admins. */
export async function resolveUserNotificationChannels(
  userId: string
): Promise<Array<'system' | 'email' | 'sms' | 'whatsapp'>> {
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  if (!userData) {
    return ['system'];
  }
  const userNotificationSettings = userData?.settings?.notifications || {};
  const channels: Array<'system' | 'email' | 'sms' | 'whatsapp'> = ['system'];
  if (userNotificationSettings.email !== false) {
    channels.push('email');
  }
  if (userData.phone) {
    if (userNotificationSettings.sms !== false) {
      channels.push('sms');
    }
    if (userNotificationSettings.whatsapp !== false) {
      channels.push('whatsapp');
    }
  }
  return channels;
}
