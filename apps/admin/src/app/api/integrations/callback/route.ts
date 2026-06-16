export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { decodeSocialOAuthState, getFirestore, PLATFORM_SOCIAL_TENANT_ID } from '@autodealers/core';
import * as admin from 'firebase-admin';
import { PLATFORM_META_OAUTH_PENDING_DOC } from '@/lib/platform-meta-oauth';
import { getOAuthRedirectOrigin, buildOAuthRedirectUrl } from '@/lib/oauth-redirect-origin';
import {
  fetchMetaUserPages,
  getPlatformSocialSettings,
  isAllowedPlatformFacebookPage,
  isBlockedPlatformFacebookPage,
} from '@/lib/platform-facebook-config';

const db = getFirestore();

function readPageAccessToken(page: { access_token?: string }): string | undefined {
  const t = page.access_token;
  return typeof t === 'string' && t.trim() ? t.trim() : undefined;
}

function sanitizePagesForStorage(
  raw: Array<{ id?: string; name?: string; instagram_business_account?: unknown }>
): Array<Record<string, unknown>> {
  return raw.map((p) => {
    const row: Record<string, unknown> = {
      id: String(p.id ?? ''),
      name: String(p.name ?? ''),
    };
    if (p.instagram_business_account != null) {
      row.instagram_business_account = p.instagram_business_account;
    }
    return row;
  });
}

function integrationsRedirect(request: NextRequest, tenantId: string, query: string): NextResponse {
  const path =
    tenantId === PLATFORM_SOCIAL_TENANT_ID
      ? `/admin/settings/integrations?${query}`
      : `/settings/integrations?${query}`;
  return NextResponse.redirect(buildOAuthRedirectUrl(path, request));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const legacyPlatform = searchParams.get('platform');

    if (error) {
      return integrationsRedirect(
        request,
        PLATFORM_SOCIAL_TENANT_ID,
        `error=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return integrationsRedirect(request, PLATFORM_SOCIAL_TENANT_ID, 'error=missing_parameters');
    }

    let type: string;
    let tenantId: string;
    let leadOwnerUserId: string | undefined;

    if (state) {
      try {
        const parsed = decodeSocialOAuthState(state);
        type = parsed.type;
        tenantId = parsed.tenantId;
        if (typeof parsed.leadOwnerUserId === 'string' && parsed.leadOwnerUserId.trim()) {
          leadOwnerUserId = parsed.leadOwnerUserId.trim();
        }
      } catch {
        return integrationsRedirect(request, PLATFORM_SOCIAL_TENANT_ID, 'error=invalid_state');
      }
    } else if (legacyPlatform) {
      type = legacyPlatform;
      tenantId = PLATFORM_SOCIAL_TENANT_ID;
    } else {
      return integrationsRedirect(request, PLATFORM_SOCIAL_TENANT_ID, 'error=missing_parameters');
    }

    if (!type || !tenantId) {
      return integrationsRedirect(request, PLATFORM_SOCIAL_TENANT_ID, 'error=invalid_state');
    }

    const credentialsDoc = await db.collection('system_settings').doc('credentials').get();
    let clientId: string | undefined;
    let clientSecret: string | undefined;

    if (credentialsDoc.exists) {
      const credentialsData = credentialsDoc.data();
      clientId = credentialsData?.metaAppId;
      clientSecret = credentialsData?.metaAppSecret;
    }

    if (!clientId || !clientSecret) {
      return integrationsRedirect(request, tenantId, 'error=meta_app_not_configured');
    }

    const baseUrl = getOAuthRedirectOrigin(request);
    const redirectUri = `${baseUrl}/api/integrations/callback`;

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `client_id=${clientId}&` +
        `client_secret=${clientSecret}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `code=${code}`,
      { method: 'GET' }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      const msg = (errorData as { error?: { message?: string } })?.error?.message || 'token_exchange_failed';
      return integrationsRedirect(request, tenantId, `error=${encodeURIComponent(msg)}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token as string;

    let primaryAdAccountId: string | undefined;
    if (type === 'facebook') {
      try {
        const ar = await fetch(
          `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,account_id,name&limit=1&access_token=${encodeURIComponent(accessToken)}`
        );
        if (ar.ok) {
          const aj = await ar.json();
          const first = aj.data?.[0];
          if (first?.id) primaryAdAccountId = String(first.id);
        }
      } catch (e) {
        console.warn('[admin oauth] me/adaccounts', e);
      }
    }

    let pageId: string | undefined;
    let pageName: string | undefined;
    let pageAccessToken: string | undefined;
    let instagramId: string | undefined;
    let pagesStored: Array<Record<string, unknown>> = [];

    if (type === 'facebook') {
      let rawList: Array<{ id: string; name: string; access_token: string }>;
      try {
        rawList = await fetchMetaUserPages(accessToken);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'facebook_pages_api_failed';
        console.error('[admin oauth] me/accounts failed:', msg);
        return integrationsRedirect(
          request,
          tenantId,
          `error=${encodeURIComponent(`facebook_pages:${msg}`)}`
        );
      }

      if (rawList.length === 0) {
        return integrationsRedirect(request, tenantId, 'error=no_facebook_page');
      }
      pagesStored = sanitizePagesForStorage(rawList);

      // Plataforma: no usar la primera página automáticamente (puede ser de un vendedor).
      if (tenantId === PLATFORM_SOCIAL_TENANT_ID) {
        const platformSettings = await getPlatformSocialSettings();
        const pagesPending = rawList
          .map((p) => ({
            id: String(p.id ?? ''),
            name: String(p.name ?? ''),
            access_token: readPageAccessToken(p) || '',
          }))
          .filter((p) => p.id && p.access_token);

        if (pagesPending.length === 0) {
          return integrationsRedirect(request, tenantId, 'error=no_facebook_page_token');
        }

        const allowedPages = pagesPending.filter(
          (p) => isAllowedPlatformFacebookPage(p.id, platformSettings).allowed
        );
        if (allowedPages.length === 0) {
          const onlyBlocked = pagesPending.every((p) => isBlockedPlatformFacebookPage(p.id));
          const code = onlyBlocked ? 'only_seller_pages' : 'no_official_platform_page';
          return integrationsRedirect(request, tenantId, `error=${code}`);
        }

        await db.collection('system_settings').doc(PLATFORM_META_OAUTH_PENDING_DOC).set({
          type: 'facebook',
          accessToken,
          primaryAdAccountId: primaryAdAccountId || null,
          leadOwnerUserId: leadOwnerUserId || null,
          pages: allowedPages,
          pagesDisplay: pagesStored,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return integrationsRedirect(request, tenantId, 'select_platform_page=1');
      }

      const firstPage = rawList[0];
      pageId = String(firstPage.id ?? '');
      pageName = String(firstPage.name ?? '');
      pageAccessToken = readPageAccessToken(firstPage);
      if (!pageAccessToken) {
        return integrationsRedirect(request, tenantId, 'error=no_facebook_page_token');
      }
    } else if (type === 'instagram') {
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}&fields=id,name,access_token,instagram_business_account{id,username}`
      );
      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        const rawList = (pagesData.data || []) as Array<{
          id?: string;
          name?: string;
          access_token?: string;
          instagram_business_account?: { id?: string };
        }>;
        if (rawList.length > 0) {
          const pageWithInstagram = rawList.find((page) => page.instagram_business_account);
          const selected = pageWithInstagram ?? rawList[0];
          pageId = String(selected.id ?? '');
          pageName = String(selected.name ?? '');
          pageAccessToken = readPageAccessToken(selected);
          if (pageWithInstagram?.instagram_business_account?.id != null) {
            instagramId = String(pageWithInstagram.instagram_business_account.id);
          }
          pagesStored = sanitizePagesForStorage(pageWithInstagram ? [pageWithInstagram] : rawList);
        }
      }
    }

    const existingSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('integrations')
      .where('type', '==', type)
      .get();

    const ownerFields =
      leadOwnerUserId != null && leadOwnerUserId !== '' ? { leadOwnerUserId } : {};

    if (!existingSnapshot.empty) {
      const integrationRef = existingSnapshot.docs[0].ref;
      const prevCreds =
        (existingSnapshot.docs[0].data()?.credentials as Record<string, unknown>) || {};
      const nextAdAccountId =
        primaryAdAccountId ||
        (prevCreds.adAccountId != null ? String(prevCreds.adAccountId) : undefined);
      await integrationRef.update({
        status: 'active',
        credentials: {
          ...prevCreds,
          accessToken,
          pageAccessToken,
          pageId,
          pageName,
          instagramId,
          pages: pagesStored,
          ...(nextAdAccountId ? { adAccountId: nextAdAccountId } : {}),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await db.collection('tenants').doc(tenantId).collection('integrations').add({
        type,
        status: 'active',
        ...ownerFields,
        credentials: {
          accessToken,
          pageAccessToken,
          pageId,
          pageName,
          instagramId,
          pages: pagesStored,
          ...(primaryAdAccountId ? { adAccountId: primaryAdAccountId } : {}),
        },
        settings: { scope: 'platform_support' },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return integrationsRedirect(request, tenantId, 'success=connected');
  } catch (err: unknown) {
    console.error('Admin OAuth callback error:', err);
    const message = err instanceof Error ? err.message : 'connection_failed';
    return integrationsRedirect(
      request,
      PLATFORM_SOCIAL_TENANT_ID,
      `error=${encodeURIComponent(message)}`
    );
  }
}
