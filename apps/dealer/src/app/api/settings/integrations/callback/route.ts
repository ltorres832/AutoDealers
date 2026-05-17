import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, decodeSocialOAuthState } from '@autodealers/core';
import * as admin from 'firebase-admin';

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=missing_parameters', request.url)
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
        new URL('/settings/integrations?error=invalid_state', request.url)
      );
    }

    if (!type || !tenantId) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=invalid_state', request.url)
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
        new URL(`/settings/integrations?error=meta_app_not_configured`, request.url)
      );
    }
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/api/settings/integrations/callback`;

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
        new URL(`/settings/integrations?error=${encodeURIComponent(errorData.error?.message || 'token_exchange_failed')}`, request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    /** Primera cuenta publicitaria accesible (Marketing API); solo con permisos ads_* en el token. */
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
        console.warn('[oauth] me/adaccounts', e);
      }
    }

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
          new URL('/settings/integrations?error=no_facebook_page', request.url)
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
          new URL('/settings/integrations?error=no_facebook_page', request.url)
        );
      }
      const firstPage = rawList[0];
      pageId = String(firstPage.id ?? '');
      pageName = String(firstPage.name ?? '');
      pageAccessToken = readPageAccessToken(firstPage);
      if (!pageAccessToken) {
        return NextResponse.redirect(
          new URL('/settings/integrations?error=no_facebook_page_token', request.url)
        );
      }
      pagesStored = sanitizePagesForStorage(rawList);
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
          pagesStored = sanitizePagesForStorage(
            pageWithInstagram ? [pageWithInstagram] : rawList
          );
        }
      }
    }

    // Guardar integración en Firestore (usar subcolección de tenants)
    const existingSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('integrations')
      .where('type', '==', type)
      .get();

    let integrationRef;
    const ownerFields =
      leadOwnerUserId != null && leadOwnerUserId !== ''
        ? { leadOwnerUserId }
        : {};
    if (!existingSnapshot.empty) {
      integrationRef = existingSnapshot.docs[0].ref;
      const prevOwner = existingSnapshot.docs[0].data()?.leadOwnerUserId;
      const resolvedOwner =
        leadOwnerUserId ||
        (typeof prevOwner === 'string' && prevOwner.trim() ? prevOwner.trim() : undefined);
      const prevCreds =
        (existingSnapshot.docs[0].data()?.credentials as Record<string, unknown>) || {};
      const nextAdAccountId =
        primaryAdAccountId ||
        (prevCreds.adAccountId != null ? String(prevCreds.adAccountId) : undefined);
      await integrationRef.update({
        status: 'active',
        ...(resolvedOwner ? { leadOwnerUserId: resolvedOwner } : {}),
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
      integrationRef = db.collection('tenants').doc(tenantId).collection('integrations').doc();
      await integrationRef.set({
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
        settings: {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.redirect(
      new URL('/settings/integrations?success=connected', request.url)
    );
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}

