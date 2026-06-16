import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const PLATFORM_SOCIAL_SETTINGS_DOC = 'platform_social';

/** Páginas conocidas de vendedores; no pueden usarse como cuenta de plataforma. */
export const BLOCKED_PLATFORM_FACEBOOK_PAGE_IDS = new Set(['136834309519281']);

export type PlatformSocialSettings = {
  officialFacebookPageId: string;
  officialFacebookPageName: string;
};

const DEFAULT_SETTINGS: PlatformSocialSettings = {
  officialFacebookPageId: '',
  officialFacebookPageName: '',
};

export async function getPlatformSocialSettings(): Promise<PlatformSocialSettings> {
  const snap = await getFirestore()
    .collection('system_settings')
    .doc(PLATFORM_SOCIAL_SETTINGS_DOC)
    .get();
  if (!snap.exists) return { ...DEFAULT_SETTINGS };
  const data = snap.data() || {};
  return {
    officialFacebookPageId: String(data.officialFacebookPageId || '').trim(),
    officialFacebookPageName: String(data.officialFacebookPageName || '').trim(),
  };
}

export async function savePlatformSocialSettings(
  input: Partial<PlatformSocialSettings>
): Promise<PlatformSocialSettings> {
  const current = await getPlatformSocialSettings();
  const next: PlatformSocialSettings = {
    officialFacebookPageId:
      input.officialFacebookPageId != null
        ? String(input.officialFacebookPageId).trim()
        : current.officialFacebookPageId,
    officialFacebookPageName:
      input.officialFacebookPageName != null
        ? String(input.officialFacebookPageName).trim()
        : current.officialFacebookPageName,
  };
  await getFirestore().collection('system_settings').doc(PLATFORM_SOCIAL_SETTINGS_DOC).set(
    {
      ...next,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return next;
}

export function isBlockedPlatformFacebookPage(pageId: string): boolean {
  return BLOCKED_PLATFORM_FACEBOOK_PAGE_IDS.has(pageId.trim());
}

export function isAllowedPlatformFacebookPage(
  pageId: string,
  settings: PlatformSocialSettings
): { allowed: boolean; reason?: string } {
  const id = pageId.trim();
  if (!id) {
    return { allowed: false, reason: 'Selecciona una página.' };
  }
  if (isBlockedPlatformFacebookPage(id)) {
    return {
      allowed: false,
      reason:
        'Esa página es de un vendedor (Auto Sales), no de AutoDealers. Conecta con la cuenta que administra la página oficial.',
    };
  }
  if (settings.officialFacebookPageId && id !== settings.officialFacebookPageId) {
    return {
      allowed: false,
      reason: `Debes elegir la página oficial configurada (ID ${settings.officialFacebookPageId}).`,
    };
  }
  return { allowed: true };
}

export async function fetchMetaUserPages(
  accessToken: string
): Promise<Array<{ id: string; name: string; access_token: string }>> {
  const pages: Array<{ id: string; name: string; access_token: string }> = [];
  let nextUrl =
    `https://graph.facebook.com/v18.0/me/accounts?` +
    `fields=id,name,access_token&limit=100&access_token=${encodeURIComponent(accessToken)}`;

  while (nextUrl) {
    const response = await fetch(nextUrl);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const message =
        (err as { error?: { message?: string } })?.error?.message || 'facebook_pages_api_failed';
      throw new Error(message);
    }
    const data = (await response.json()) as {
      data?: Array<{ id?: string; name?: string; access_token?: string }>;
      paging?: { next?: string };
    };
    for (const page of data.data || []) {
      const id = String(page.id ?? '').trim();
      const access_token = String(page.access_token ?? '').trim();
      if (!id || !access_token) continue;
      pages.push({
        id,
        name: String(page.name ?? '').trim() || id,
        access_token,
      });
    }
    nextUrl = data.paging?.next || '';
  }

  return pages;
}
