import { getFirestore, PLATFORM_SOCIAL_TENANT_ID } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const PLATFORM_META_OAUTH_PENDING_DOC = 'platform_meta_oauth_pending';

export type PlatformMetaOAuthPending = {
  type: 'facebook';
  accessToken: string;
  primaryAdAccountId?: string | null;
  leadOwnerUserId?: string | null;
  pages: Array<{ id: string; name: string; access_token: string }>;
  pagesDisplay: Array<Record<string, unknown>>;
};

export async function getPlatformMetaOAuthPending(): Promise<PlatformMetaOAuthPending | null> {
  const snap = await getFirestore()
    .collection('system_settings')
    .doc(PLATFORM_META_OAUTH_PENDING_DOC)
    .get();
  if (!snap.exists) return null;
  const data = snap.data() as PlatformMetaOAuthPending;
  if (data?.type !== 'facebook' || !Array.isArray(data.pages) || data.pages.length === 0) {
    return null;
  }
  return data;
}

export async function clearPlatformMetaOAuthPending(): Promise<void> {
  await getFirestore().collection('system_settings').doc(PLATFORM_META_OAUTH_PENDING_DOC).delete();
}

export async function savePlatformFacebookIntegration(input: {
  accessToken: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  pagesStored: Array<Record<string, unknown>>;
  primaryAdAccountId?: string;
  leadOwnerUserId?: string;
}): Promise<void> {
  const db = getFirestore();
  const tenantId = PLATFORM_SOCIAL_TENANT_ID;
  const existingSnapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('integrations')
    .where('type', '==', 'facebook')
    .get();

  const ownerFields =
    input.leadOwnerUserId != null && input.leadOwnerUserId !== ''
      ? { leadOwnerUserId: input.leadOwnerUserId }
      : {};

  const credentials = {
    accessToken: input.accessToken,
    pageAccessToken: input.pageAccessToken,
    pageId: input.pageId,
    pageName: input.pageName,
    pages: input.pagesStored,
    ...(input.primaryAdAccountId ? { adAccountId: input.primaryAdAccountId } : {}),
  };

  if (!existingSnapshot.empty) {
    const integrationRef = existingSnapshot.docs[0].ref;
    const prevCreds =
      (existingSnapshot.docs[0].data()?.credentials as Record<string, unknown>) || {};
    const nextAdAccountId =
      input.primaryAdAccountId ||
      (prevCreds.adAccountId != null ? String(prevCreds.adAccountId) : undefined);
    await integrationRef.update({
      status: 'active',
      credentials: {
        ...prevCreds,
        ...credentials,
        ...(nextAdAccountId ? { adAccountId: nextAdAccountId } : {}),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await db.collection('tenants').doc(tenantId).collection('integrations').add({
      type: 'facebook',
      status: 'active',
      ...ownerFields,
      credentials,
      settings: { scope: 'platform_support' },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await db.collection('tenants').doc(tenantId).set(
    {
      name: 'AutoDealers Platform',
      type: 'platform',
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
