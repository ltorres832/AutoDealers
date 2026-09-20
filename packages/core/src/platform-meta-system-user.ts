/**
 * Tokens permanentes de plataforma vía Meta Business Manager System User.
 * Los user tokens OAuth tienen data_access_expires_at (~90 días); un System User
 * token + page token derivado no vencen hasta revocación manual.
 */

import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import { getMetaCredentials } from './credentials';
import { PLATFORM_SOCIAL_TENANT_ID } from './platform-social';

const GRAPH_VERSION = 'v18.0';

export const PLATFORM_META_BUSINESS_ID = '25825518717087396';
export const PLATFORM_META_SYSTEM_USER_ID = '122101529703480902';
export const PLATFORM_META_PAGE_ID = '935597762971394';
export const PLATFORM_META_PREFERRED_AD_ACCOUNT_ID = 'act_1080340951331625';

export type PlatformSystemUserInstallResult = {
  ok: boolean;
  error?: string;
  systemUserId?: string;
  pageId?: string;
  pageName?: string;
  adAccountId?: string;
  expiresAt?: number | null;
  dataAccessExpiresAt?: number | null;
  tokenNeverExpires?: boolean;
  scopes?: string[];
};

type DebugTokenData = {
  is_valid?: boolean;
  type?: string;
  app_id?: string;
  expires_at?: number;
  data_access_expires_at?: number;
  scopes?: string[];
  error?: { message?: string };
};

async function debugToken(
  inputToken: string,
  appId: string,
  appSecret: string
): Promise<DebugTokenData | null> {
  const appToken = `${appId}|${appSecret}`;
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/debug_token?` +
      `input_token=${encodeURIComponent(inputToken)}&` +
      `access_token=${encodeURIComponent(appToken)}`
  );
  const json = (await res.json()) as { data?: DebugTokenData; error?: { message?: string } };
  if (!res.ok || !json.data) return null;
  return json.data;
}

function isNeverExpiring(data: DebugTokenData): boolean {
  const exp = data.expires_at ?? 0;
  const da = data.data_access_expires_at ?? 0;
  return (exp === 0 || exp == null) && (da === 0 || da == null);
}

async function upsertPlatformIntegration(opts: {
  type: 'facebook' | 'instagram';
  credentials: Record<string, unknown>;
  leadOwnerUserId?: string;
}): Promise<void> {
  const db = getFirestore();
  const tenantId = PLATFORM_SOCIAL_TENANT_ID;
  const snap = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('integrations')
    .where('type', '==', opts.type)
    .limit(1)
    .get();

  const base = {
    status: 'active',
    credentials: opts.credentials,
    settings: { scope: 'platform_support' },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!snap.empty) {
    const prev = (snap.docs[0].data()?.credentials as Record<string, unknown>) || {};
    await snap.docs[0].ref.update({
      ...base,
      credentials: { ...prev, ...opts.credentials },
    });
  } else {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('integrations')
      .add({
        type: opts.type,
        ...(opts.leadOwnerUserId ? { leadOwnerUserId: opts.leadOwnerUserId } : {}),
        ...base,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  }

  await db.collection('tenants').doc(tenantId).set(
    {
      name: 'AutoDealersOnline Platform',
      type: 'platform',
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Valida un System User access token, obtiene page token nunca-expirante y
 * lo guarda en tenants/_platform/integrations (facebook + instagram).
 */
export async function installPlatformSystemUserToken(input: {
  systemUserAccessToken: string;
  pageId?: string;
  adAccountId?: string;
  systemUserId?: string;
  businessId?: string;
  leadOwnerUserId?: string;
}): Promise<PlatformSystemUserInstallResult> {
  const token = String(input.systemUserAccessToken || '').trim();
  if (!token) {
    return { ok: false, error: 'Falta el System User access token.' };
  }

  const { appId, appSecret } = await getMetaCredentials();
  if (!appId || !appSecret) {
    return { ok: false, error: 'Faltan metaAppId / metaAppSecret en credenciales.' };
  }

  const debug = await debugToken(token, appId, appSecret);
  if (!debug?.is_valid) {
    return {
      ok: false,
      error: debug?.error?.message || 'El token no es válido (debug_token).',
    };
  }

  if (debug.app_id && String(debug.app_id) !== String(appId)) {
    return {
      ok: false,
      error: `El token pertenece a otra app (${debug.app_id}), no a AutoDealersOnline (${appId}).`,
    };
  }

  const preferredPageId = String(input.pageId || PLATFORM_META_PAGE_ID).trim();
  const pagesRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?` +
      `fields=id,name,access_token,instagram_business_account{id,username}&limit=100&` +
      `access_token=${encodeURIComponent(token)}`
  );
  const pagesJson = (await pagesRes.json()) as {
    data?: Array<{
      id?: string;
      name?: string;
      access_token?: string;
      instagram_business_account?: { id?: string; username?: string };
    }>;
    error?: { message?: string };
  };

  if (!pagesRes.ok || !Array.isArray(pagesJson.data) || pagesJson.data.length === 0) {
    return {
      ok: false,
      error:
        pagesJson.error?.message ||
        'El System User no ve ninguna página. En Business Manager asígnale la página AutoDealers-Online (MANAGE) y regenera el token con permisos de Pages.',
    };
  }

  const page =
    pagesJson.data.find((p) => String(p.id) === preferredPageId) || pagesJson.data[0];
  const pageId = String(page?.id || '').trim();
  const pageName = String(page?.name || '').trim() || pageId;
  const pageAccessToken = String(page?.access_token || '').trim();
  if (!pageId || !pageAccessToken) {
    return { ok: false, error: 'No se pudo obtener page access token del System User.' };
  }

  const pageDebug = await debugToken(pageAccessToken, appId, appSecret);
  const tokenNeverExpires = isNeverExpiring(debug) && (!pageDebug || isNeverExpiring(pageDebug));

  let adAccountId = String(
    input.adAccountId || PLATFORM_META_PREFERRED_AD_ACCOUNT_ID
  ).trim();
  try {
    const adsRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/me/adaccounts?` +
        `fields=id,name,account_status&limit=50&access_token=${encodeURIComponent(token)}`
    );
    const adsJson = (await adsRes.json()) as {
      data?: Array<{ id?: string; account_status?: number }>;
    };
    const active = (adsJson.data || []).find(
      (a) => String(a.id) === adAccountId && Number(a.account_status) === 1
    );
    if (!active) {
      const firstActive = (adsJson.data || []).find((a) => Number(a.account_status) === 1);
      if (firstActive?.id) adAccountId = String(firstActive.id);
    }
  } catch {
    // keep preferred
  }

  const systemUserId = String(input.systemUserId || PLATFORM_META_SYSTEM_USER_ID).trim();
  const businessId = String(input.businessId || PLATFORM_META_BUSINESS_ID).trim();
  const ig = page?.instagram_business_account;

  const sharedCredentials: Record<string, unknown> = {
    accessToken: token,
    pageAccessToken,
    pageId,
    pageName,
    pages: pagesJson.data.map((p) => ({
      id: p.id,
      name: p.name,
      ...(p.instagram_business_account
        ? { instagram_business_account: p.instagram_business_account }
        : {}),
    })),
    adAccountId,
    businessId,
    systemUserId,
    tokenSource: 'system_user',
    tokenNeverExpires: tokenNeverExpires === true,
    installedAt: new Date().toISOString(),
    ...(ig?.id
      ? {
          instagramBusinessAccountId: String(ig.id),
          instagramUsername: ig.username != null ? String(ig.username) : undefined,
        }
      : {}),
  };

  await upsertPlatformIntegration({
    type: 'facebook',
    credentials: sharedCredentials,
    leadOwnerUserId: input.leadOwnerUserId,
  });
  await upsertPlatformIntegration({
    type: 'instagram',
    credentials: sharedCredentials,
    leadOwnerUserId: input.leadOwnerUserId,
  });

  // Mantener página oficial alineada
  await getFirestore()
    .collection('system_settings')
    .doc('platform_social')
    .set(
      {
        officialFacebookPageId: pageId,
        officialFacebookPageName: pageName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return {
    ok: true,
    systemUserId,
    pageId,
    pageName,
    adAccountId,
    expiresAt: debug.expires_at ?? 0,
    dataAccessExpiresAt: debug.data_access_expires_at ?? 0,
    tokenNeverExpires,
    scopes: debug.scopes || [],
  };
}

export async function getPlatformMetaTokenHealthSummary(): Promise<{
  facebook?: Record<string, unknown>;
  instagram?: Record<string, unknown>;
}> {
  const db = getFirestore();
  const { appId, appSecret } = await getMetaCredentials();
  const result: { facebook?: Record<string, unknown>; instagram?: Record<string, unknown> } =
    {};

  for (const type of ['facebook', 'instagram'] as const) {
    const snap = await db
      .collection('tenants')
      .doc(PLATFORM_SOCIAL_TENANT_ID)
      .collection('integrations')
      .where('type', '==', type)
      .limit(1)
      .get();
    if (snap.empty) continue;
    const creds = (snap.docs[0].data()?.credentials as Record<string, unknown>) || {};
    const accessToken =
      typeof creds.accessToken === 'string' ? creds.accessToken.trim() : '';
    const pageAccessToken =
      typeof creds.pageAccessToken === 'string' ? creds.pageAccessToken.trim() : '';
    let debug: DebugTokenData | null = null;
    let pageDebug: DebugTokenData | null = null;
    if (appId && appSecret && accessToken) {
      debug = await debugToken(accessToken, appId, appSecret);
    }
    if (appId && appSecret && pageAccessToken) {
      pageDebug = await debugToken(pageAccessToken, appId, appSecret);
    }
    result[type] = {
      status: snap.docs[0].data()?.status,
      pageId: creds.pageId ?? null,
      pageName: creds.pageName ?? null,
      adAccountId: creds.adAccountId ?? null,
      tokenSource: creds.tokenSource ?? null,
      tokenNeverExpires: creds.tokenNeverExpires === true,
      systemUserId: creds.systemUserId ?? null,
      businessId: creds.businessId ?? null,
      userToken: debug
        ? {
            is_valid: debug.is_valid === true,
            type: debug.type,
            expires_at: debug.expires_at ?? 0,
            data_access_expires_at: debug.data_access_expires_at ?? 0,
          }
        : null,
      pageToken: pageDebug
        ? {
            is_valid: pageDebug.is_valid === true,
            type: pageDebug.type,
            expires_at: pageDebug.expires_at ?? 0,
            data_access_expires_at: pageDebug.data_access_expires_at ?? 0,
          }
        : null,
    };
  }

  return result;
}
