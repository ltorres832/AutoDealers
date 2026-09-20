import { getFirestore } from '@autodealers/shared';
import {
  announceNewRegistrationOnSocial,
  type RegistrationAnnouncementInput,
} from './registration-facebook-announce';
import { resolveMemberSocialAnnounceImage } from './social-post-image';

/** Evita anuncios duplicados en redes al activar membresía / registro. */
export async function triggerRegistrationSocialAnnounceIfNeeded(
  input: RegistrationAnnouncementInput
): Promise<void> {
  const db = getFirestore();
  const tenantSnap = await db.collection('tenants').doc(input.tenantId).get();
  const ann = tenantSnap.data()?.registrationSocialAnnouncement as
    | { platformPostedAt?: unknown; platformPostId?: string }
    | undefined;

  if (ann?.platformPostedAt || ann?.platformPostId) {
    return;
  }

  await announceNewRegistrationOnSocial(input);
}

/**
 * Reintenta el anuncio de bienvenida cuando el vendedor sube foto o el dealer sube logo.
 */
export async function retryRegistrationSocialAnnounceWhenReady(
  tenantId: string,
  userId: string
): Promise<void> {
  const db = getFirestore();
  const tenantSnap = await db.collection('tenants').doc(tenantId).get();
  const ann = tenantSnap.data()?.registrationSocialAnnouncement as
    | {
        platformPostedAt?: unknown;
        pendingPlatformSocialPhoto?: boolean;
        displayName?: string;
        accountType?: 'seller' | 'dealer';
        userId?: string;
      }
    | undefined;

  if (ann?.platformPostedAt) return;
  if (!ann?.pendingPlatformSocialPhoto) return;
  if (ann.userId && ann.userId !== userId) return;

  const userSnap = await db.collection('users').doc(userId).get();
  const userData = userSnap.data();
  const accountType: 'seller' | 'dealer' =
    ann.accountType === 'dealer' || userData?.role === 'dealer' ? 'dealer' : 'seller';

  const imageUrl = await resolveMemberSocialAnnounceImage({
    tenantId,
    userId,
    accountType,
  });
  if (!imageUrl) return;

  const displayName =
    String(ann.displayName || userData?.name || tenantSnap.data()?.name || '').trim() ||
    'Nuevo miembro';

  await announceNewRegistrationOnSocial({
    tenantId,
    userId,
    displayName,
    accountType,
    companyName:
      typeof tenantSnap.data()?.companyName === 'string'
        ? tenantSnap.data()?.companyName
        : undefined,
    profileImageUrl: imageUrl,
  });
}
