import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

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

    // Parse state: format is "type_tenantId"
    const [type, tenantId] = state.split('_');
    
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

    // Obtener información de las páginas/perfiles del usuario
    let pageId, pageName, instagramId, pages = [];
    
    if (type === 'facebook') {
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}&fields=id,name,access_token`
      );
      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        if (pagesData.data && pagesData.data.length > 0) {
          pages = pagesData.data;
          // Si solo hay una página, usarla automáticamente
          // Si hay múltiples, guardar todas y usar la primera por defecto
          const firstPage = pagesData.data[0];
          pageId = firstPage.id;
          pageName = firstPage.name;
        }
      }
    } else if (type === 'instagram') {
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}&fields=id,name,access_token,instagram_business_account{id,username}`
      );
      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        if (pagesData.data && pagesData.data.length > 0) {
          // Buscar página con Instagram Business Account conectado
          const pageWithInstagram = pagesData.data.find(
            (page: any) => page.instagram_business_account
          );
          
          if (pageWithInstagram) {
            pageId = pageWithInstagram.id;
            pageName = pageWithInstagram.name;
            instagramId = pageWithInstagram.instagram_business_account.id;
            pages = [pageWithInstagram];
          } else {
            // Si no hay Instagram conectado, guardar la primera página
            const firstPage = pagesData.data[0];
            pageId = firstPage.id;
            pageName = firstPage.name;
            pages = [firstPage];
          }
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
    if (!existingSnapshot.empty) {
      integrationRef = existingSnapshot.docs[0].ref;
      await integrationRef.update({
        status: 'active',
        credentials: {
          accessToken,
          pageId,
          pageName,
          instagramId,
          pages: pages, // Guardar todas las páginas disponibles
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      integrationRef = db.collection('tenants').doc(tenantId).collection('integrations').doc();
      await integrationRef.set({
        type,
        status: 'active',
        credentials: {
          accessToken,
          pageId,
          pageName,
          instagramId,
          pages: pages, // Guardar todas las páginas disponibles
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

