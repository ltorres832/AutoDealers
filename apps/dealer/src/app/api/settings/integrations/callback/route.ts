import { NextRequest, NextResponse } from 'next/server';
import { decodeSocialOAuthState, publishPendingTenantRegistrationFacebookPost } from '@autodealers/core';
import { META_PAGES_GRAPH_FIELDS } from '@autodealers/core/meta-oauth-scopes';
import { finalizeMetaUserAccessToken, type MetaTokenHealth } from '@autodealers/core/meta-token-health';
import { buildAppRedirectUrl } from '@/lib/app-origin';
import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

const db = getFirestore();

function readPageAccessToken(page: { access_token?: string }): string | undefined {
  const t = page.access_token;
  return typeof t === 'string' && t.trim() ? t.trim() : undefined;
}

/** Guarda solo id/nombre (y cuenta IG vinculada) sin tokens en cada elemento. */
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

export const dynamic = 'force-dynamic';

function metaHealthQuery(health: MetaTokenHealth): string {
  if (health.missingScopes.length > 0) return '&meta_warn=missing_scopes';
  if (!health.readyForPaidAds) return '&meta_warn=ads_not_ready';
  if (!health.readyForOrganic) return '&meta_warn=organic_not_ready';
  return '';
}

function credentialsWithHealth(
  creds: Record<string, unknown>,
  health?: MetaTokenHealth
): Record<string, unknown> {
  if (!health) return creds;
  return {
    ...creds,
    metaTokenHealth: health,
    scopesGranted: health.grantedScopes,
  };
}

async function enrichAccessTokenAndHealth(
  clientId: string,
  clientSecret: string,
  shortLivedToken: string,
  pageAccessToken?: string,
  pageId?: string,
  adAccountId?: string
): Promise<{ accessToken: string; tokenHealth: MetaTokenHealth; adAccountId?: string }> {
  const finalized = await finalizeMetaUserAccessToken({
    appId: clientId,
    appSecret: clientSecret,
    shortLivedToken,
    pageAccessToken,
    pageId,
    adAccountId,
  });
  return {
    accessToken: finalized.accessToken,
    tokenHealth: finalized.tokenHealth,
    adAccountId: finalized.tokenHealth.adAccountId ?? adAccountId,
  };
}

async function upsertTenantIntegration(
  tenantId: string,
  integrationType: string,
  leadOwnerUserId: string | undefined,
  credentials: Record<string, unknown>,
  primaryAdAccountId?: string
) {
  const existingSnapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('integrations')
    .where('type', '==', integrationType)
    .get();

  const ownerFields =
    leadOwnerUserId != null && leadOwnerUserId !== '' ? { leadOwnerUserId } : {};

  if (!existingSnapshot.empty) {
    const doc = existingSnapshot.docs[0];
    const prevOwner = doc.data()?.leadOwnerUserId;
    const resolvedOwner =
      leadOwnerUserId ||
      (typeof prevOwner === 'string' && prevOwner.trim() ? prevOwner.trim() : undefined);
    const prevCreds = (doc.data()?.credentials as Record<string, unknown>) || {};
    const nextAdAccountId =
      primaryAdAccountId ||
      (prevCreds.adAccountId != null ? String(prevCreds.adAccountId) : undefined);
    await doc.ref.update({
      status: 'active',
      ...(resolvedOwner ? { leadOwnerUserId: resolvedOwner } : {}),
      credentials: {
        ...prevCreds,
        ...credentials,
        ...(nextAdAccountId ? { adAccountId: nextAdAccountId } : {}),
      },
      updatedAt: getFirestoreFieldValue().serverTimestamp(),
    });
    return doc.ref.id;
  }

  const integrationRef = db.collection('tenants').doc(tenantId).collection('integrations').doc();
  await integrationRef.set({
    type: integrationType,
    status: 'active',
    ...ownerFields,
    credentials: {
      ...credentials,
      ...(primaryAdAccountId ? { adAccountId: primaryAdAccountId } : {}),
    },
    settings: {},
    createdAt: getFirestoreFieldValue().serverTimestamp(),
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  });
  return integrationRef.id;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        buildAppRedirectUrl(`/settings/integrations?error=${encodeURIComponent(error)}`, request)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        buildAppRedirectUrl('/settings/integrations?error=missing_parameters', request)
      );
    }

    let type: string;
    let tenantId: string;
    let leadOwnerUserId: string | undefined;
    try {
      const parsed = decodeSocialOAuthState(state);
      type = parsed.type;
      tenantId = parsed.tenantId;
      if (typeof parsed.leadOwnerUserId === 'string' && parsed.leadOwnerUserId.trim()) {
        leadOwnerUserId = parsed.leadOwnerUserId.trim();
      }
    } catch {
      return NextResponse.redirect(
        buildAppRedirectUrl('/settings/integrations?error=invalid_state', request)
      );
    }

    if (!type || !tenantId) {
      return NextResponse.redirect(
        buildAppRedirectUrl('/settings/integrations?error=invalid_state', request)
      );
    }

    // Obtener credenciales globales desde system_settings.credentials (donde el admin las guarda)
    const credentialsDoc = await db.collection('system_settings').doc('credentials').get();
    
    let clientId: string | undefined;
    let clientSecret: string | undefined;

    if (credentialsDoc.exists) {
      const credentialsData = credentialsDoc.data();
      clientId = credentialsData?.metaAppId;
      clientSecret = credentialsData?.metaAppSecret;
    }

    // Si no hay credenciales globales, intentar obtener del tenant (compatibilidad hacia atrás)
    if (!clientId || !clientSecret) {
      const integrationSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations')
        .where('type', '==', type)
        .get();

      if (!integrationSnapshot.empty) {
        const integrationData = integrationSnapshot.docs[0].data();
        const tenantCredentials = integrationData.credentials;
        clientId = tenantCredentials?.appId || clientId;
        clientSecret = tenantCredentials?.appSecret || clientSecret;
      }
    }

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        buildAppRedirectUrl(`/settings/integrations?error=meta_app_not_configured`, request)
      );
    }
    const { getIntegrationsOAuthCallbackUrl } = await import('@/lib/app-origin');
    const redirectUri = getIntegrationsOAuthCallbackUrl(request);

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${clientId}&` +
      `client_secret=${clientSecret}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `code=${code}`,
      {
        method: 'GET',
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange error:', errorData);
      return NextResponse.redirect(
        buildAppRedirectUrl(`/settings/integrations?error=${encodeURIComponent(errorData.error?.message || 'token_exchange_failed')}`, request)
      );
    }

    const tokenData = await tokenResponse.json();
    const shortLivedToken = tokenData.access_token as string;

    /** Primera cuenta publicitaria accesible (Marketing API); solo con permisos ads_* en el token. */
    let primaryAdAccountId: string | undefined;
    if (type === 'facebook' || type === 'meta') {
      try {
        const ar = await fetch(
          `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,account_id,name&limit=1&access_token=${encodeURIComponent(shortLivedToken)}`
        );
        if (ar.ok) {
          const aj = await ar.json();
          const first = aj.data?.[0];
          if (first?.id) primaryAdAccountId = String(first.id);
        }
      } catch (e) {
        console.warn('[oauth] me/adaccounts', e);
      }
    }

    let accessToken = shortLivedToken;
    let tokenHealth: MetaTokenHealth | undefined;

    // Páginas de Facebook (Fan Page / negocio), no el perfil personal
    let pageId: string | undefined;
    let pageName: string | undefined;
    let pageAccessToken: string | undefined;
    let instagramId: string | undefined;
    let pagesStored: Array<Record<string, unknown>> = [];

    if (type === 'facebook') {
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}&fields=id,name,access_token`
      );
      if (!pagesResponse.ok) {
        return NextResponse.redirect(
          buildAppRedirectUrl('/settings/integrations?error=no_facebook_page', request)
        );
      }
      const pagesData = await pagesResponse.json();
      const rawList = (pagesData.data || []) as Array<{
        id?: string;
        name?: string;
        access_token?: string;
      }>;
      if (rawList.length === 0) {
        return NextResponse.redirect(
          buildAppRedirectUrl('/settings/integrations?error=no_facebook_page', request)
        );
      }
      const firstPage = rawList[0];
      pageId = String(firstPage.id ?? '');
      pageName = String(firstPage.name ?? '');
      pageAccessToken = readPageAccessToken(firstPage);
      if (!pageAccessToken) {
        return NextResponse.redirect(
          buildAppRedirectUrl('/settings/integrations?error=no_facebook_page_token', request)
        );
      }
      pagesStored = sanitizePagesForStorage(rawList);
    } else if (type === 'instagram') {
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}&fields=id,name,access_token,instagram_business_account{id,username}`
      );
      if (!pagesResponse.ok) {
        return NextResponse.redirect(
          buildAppRedirectUrl('/settings/integrations?error=no_facebook_page', request)
        );
      }
      const pagesData = await pagesResponse.json();
      const rawList = (pagesData.data || []) as Array<{
        id?: string;
        name?: string;
        access_token?: string;
        instagram_business_account?: { id?: string };
      }>;
      const pageWithInstagram = rawList.find((page) => page.instagram_business_account?.id);
      if (!pageWithInstagram) {
        return NextResponse.redirect(
          buildAppRedirectUrl(
            '/settings/integrations?success=meta&instagram=0&notice=no_instagram_business',
            request.url
          )
        );
      }
      pageId = String(pageWithInstagram.id ?? '');
      pageName = String(pageWithInstagram.name ?? '');
      pageAccessToken = readPageAccessToken(pageWithInstagram);
      if (!pageAccessToken) {
        return NextResponse.redirect(
          buildAppRedirectUrl('/settings/integrations?error=no_facebook_page_token', request)
        );
      }
      instagramId = String(pageWithInstagram.instagram_business_account!.id);
      pagesStored = sanitizePagesForStorage([pageWithInstagram]);
    } else if (type === 'meta') {
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}&fields=${META_PAGES_GRAPH_FIELDS}`
      );
      if (!pagesResponse.ok) {
        return NextResponse.redirect(
          buildAppRedirectUrl('/settings/integrations?error=no_facebook_page', request)
        );
      }
      const pagesData = await pagesResponse.json();
      const rawList = (pagesData.data || []) as Array<{
        id?: string;
        name?: string;
        access_token?: string;
        instagram_business_account?: { id?: string; username?: string };
      }>;
      if (rawList.length === 0) {
        return NextResponse.redirect(
          buildAppRedirectUrl('/settings/integrations?error=no_facebook_page', request)
        );
      }
      const firstPage = rawList[0];
      const pageWithInstagram = rawList.find((page) => page.instagram_business_account?.id);
      const fbToken = readPageAccessToken(firstPage);
      if (!fbToken) {
        return NextResponse.redirect(
          buildAppRedirectUrl('/settings/integrations?error=no_facebook_page_token', request)
        );
      }
      await upsertTenantIntegration(
        tenantId,
        'facebook',
        leadOwnerUserId,
        {
          accessToken,
          pageAccessToken: fbToken,
          pageId: String(firstPage.id ?? ''),
          pageName: String(firstPage.name ?? ''),
          pages: sanitizePagesForStorage(rawList),
        },
        primaryAdAccountId
      );

      let instagramConnected = '0';
      if (pageWithInstagram) {
        const igToken = readPageAccessToken(pageWithInstagram);
        if (igToken && pageWithInstagram.instagram_business_account?.id) {
          await upsertTenantIntegration(
            tenantId,
            'instagram',
            leadOwnerUserId,
            credentialsWithHealth(
              {
                accessToken,
                pageAccessToken: igToken,
                pageId: String(pageWithInstagram.id ?? ''),
                pageName: String(pageWithInstagram.name ?? ''),
                instagramId: String(pageWithInstagram.instagram_business_account.id),
                pages: sanitizePagesForStorage([pageWithInstagram]),
              },
              tokenHealth
            ),
            undefined
          );
          instagramConnected = '1';
        }
      }

      const warn = tokenHealth ? metaHealthQuery(tokenHealth) : '';
      publishPendingTenantRegistrationFacebookPost(tenantId).catch((e) =>
        console.warn('[oauth] pending registration FB post:', e)
      );
      return NextResponse.redirect(
        buildAppRedirectUrl(
          `/settings/integrations?success=meta&facebook=1&instagram=${instagramConnected}${warn}`,
          request.url
        )
      );
    }

    if (pageAccessToken) {
      const enriched = await enrichAccessTokenAndHealth(
        clientId,
        clientSecret,
        accessToken,
        pageAccessToken,
        pageId,
        primaryAdAccountId
      );
      accessToken = enriched.accessToken;
      tokenHealth = enriched.tokenHealth;
      primaryAdAccountId = enriched.adAccountId ?? primaryAdAccountId;
    }

    await upsertTenantIntegration(
      tenantId,
      type,
      leadOwnerUserId,
      credentialsWithHealth(
        {
          accessToken,
          pageAccessToken,
          pageId,
          pageName,
          instagramId,
          pages: pagesStored,
        },
        tokenHealth
      ),
      primaryAdAccountId
    );

    const warn = tokenHealth ? metaHealthQuery(tokenHealth) : '';
    if (type === 'facebook' || type === 'meta') {
      publishPendingTenantRegistrationFacebookPost(tenantId).catch((e) =>
        console.warn('[oauth] pending registration FB post:', e)
      );
    }
    return NextResponse.redirect(
      buildAppRedirectUrl(
        type === 'instagram'
          ? `/settings/integrations?success=meta&instagram=1${warn}`
          : `/settings/integrations?success=connected${warn}`,
        request.url
      )
    );
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      buildAppRedirectUrl(`/settings/integrations?error=${encodeURIComponent(error.message)}`, request)
    );
  }
}

