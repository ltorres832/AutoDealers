import { getFirestore } from '@autodealers/shared';
import { resolvePublicWebUrl } from '@autodealers/shared/platform-urls';
import { DEFAULT_PLATFORM_BRAND_ASSET } from '@autodealers/shared/platform-branding-client';

export type PostContentLike = {
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  hashtags?: string[];
};

/** Convierte rutas relativas (/brand/...) en URL absoluta pública para Graph API. */
export function toAbsolutePublicImageUrl(imageUrl: string): string {
  const trimmed = imageUrl.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = resolvePublicWebUrl().replace(/\/$/, '');
  return trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

export function postContentHasImage(content: PostContentLike): boolean {
  return Boolean(content.imageUrl?.trim());
}

/** Exige imagen; usa fallback si se proporciona. */
export function requirePostImage(
  content: PostContentLike,
  fallbackImageUrl?: string
): PostContentLike & { imageUrl: string } {
  const raw = content.imageUrl?.trim() || fallbackImageUrl?.trim() || '';
  if (!raw) {
    throw new Error(
      'Todas las publicaciones en redes sociales requieren una imagen (Facebook e Instagram).'
    );
  }
  return {
    ...content,
    imageUrl: toAbsolutePublicImageUrl(raw),
  };
}

/**
 * Imagen real del miembro para anuncios en redes (sin logo genérico de plataforma).
 * Vendedor: solo su foto. Dealer: foto de usuario, logo del tenant o foto del tenant.
 */
export async function resolveMemberSocialAnnounceImage(input: {
  tenantId: string;
  userId: string;
  accountType: 'seller' | 'dealer';
  profileImageUrl?: string;
}): Promise<string | null> {
  if (input.profileImageUrl?.trim()) {
    return toAbsolutePublicImageUrl(input.profileImageUrl);
  }

  const db = getFirestore();

  if (input.accountType === 'seller' && input.userId) {
    const userSnap = await db.collection('users').doc(input.userId).get();
    const userData = userSnap.data();
    const userPhoto =
      (typeof userData?.photo === 'string' && userData.photo.trim()) ||
      (typeof userData?.photoUrl === 'string' && userData.photoUrl.trim()) ||
      (typeof userData?.profilePhoto === 'string' && userData.profilePhoto.trim()) ||
      '';
    return userPhoto ? toAbsolutePublicImageUrl(userPhoto) : null;
  }

  if (input.userId) {
    const userSnap = await db.collection('users').doc(input.userId).get();
    const userData = userSnap.data();
    const userPhoto =
      (typeof userData?.photo === 'string' && userData.photo.trim()) ||
      (typeof userData?.photoUrl === 'string' && userData.photoUrl.trim()) ||
      '';
    if (userPhoto) return toAbsolutePublicImageUrl(userPhoto);
  }

  const tenantSnap = await db.collection('tenants').doc(input.tenantId).get();
  const tenantData = tenantSnap.data();
  const brandingLogo =
    typeof (tenantData?.branding as { logo?: string } | undefined)?.logo === 'string'
      ? String((tenantData?.branding as { logo?: string }).logo).trim()
      : '';
  if (brandingLogo) return toAbsolutePublicImageUrl(brandingLogo);

  const dealerPhoto =
    typeof tenantData?.photo === 'string'
      ? tenantData.photo.trim()
      : typeof tenantData?.photoUrl === 'string'
        ? tenantData.photoUrl.trim()
        : '';
  if (dealerPhoto) return toAbsolutePublicImageUrl(dealerPhoto);

  return null;
}

/** Logo / foto del miembro para anuncios de bienvenida. */
export async function resolveMemberProfileImageUrl(input: {
  tenantId: string;
  userId: string;
  accountType: 'seller' | 'dealer';
}): Promise<string> {
  const db = getFirestore();

  if (input.accountType === 'seller' && input.userId) {
    const userSnap = await db.collection('users').doc(input.userId).get();
    const userData = userSnap.data();
    const userPhoto =
      (typeof userData?.photo === 'string' && userData.photo.trim()) ||
      (typeof userData?.photoUrl === 'string' && userData.photoUrl.trim()) ||
      '';
    if (userPhoto) return toAbsolutePublicImageUrl(userPhoto);
  }

  const tenantSnap = await db.collection('tenants').doc(input.tenantId).get();
  const tenantData = tenantSnap.data();
  const brandingLogo =
    typeof (tenantData?.branding as { logo?: string } | undefined)?.logo === 'string'
      ? String((tenantData?.branding as { logo?: string }).logo).trim()
      : '';
  if (brandingLogo) return toAbsolutePublicImageUrl(brandingLogo);

  const dealerPhoto =
    typeof tenantData?.photo === 'string'
      ? tenantData.photo.trim()
      : typeof tenantData?.photoUrl === 'string'
        ? tenantData.photoUrl.trim()
        : '';
  if (dealerPhoto) return toAbsolutePublicImageUrl(dealerPhoto);

  try {
    const platformBranding = await db.collection('admin_settings').doc('branding').get();
    const platformLogo =
      typeof platformBranding.data()?.logo === 'string'
        ? platformBranding.data()!.logo.trim()
        : '';
    if (platformLogo) return toAbsolutePublicImageUrl(platformLogo);
  } catch {
    /* ignore */
  }

  return toAbsolutePublicImageUrl(DEFAULT_PLATFORM_BRAND_ASSET);
}
