export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createSocialIntegration } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.redirect('/login');
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const platform = searchParams.get('platform');

    if (!code || !platform) {
      return NextResponse.redirect('/settings/integrations?error=missing_params');
    }

    // Intercambiar código por access token
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const redirectUri = `${baseUrl}/api/integrations/callback?platform=${platform}`;

    let accessToken = '';
    let accountId = '';
    let accountName = '';

    if (platform === 'facebook' || platform === 'instagram') {
      // Obtener credenciales de Meta desde Firestore
      const { getMetaCredentials } = await import('@autodealers/core');
      const metaCreds = await getMetaCredentials();
      const appId = metaCreds.appId;
      const appSecret = metaCreds.appSecret;
      
      if (!appId || !appSecret) {
        return NextResponse.redirect('/admin/settings/integrations?error=missing_credentials');
      }

      // Obtener access token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
      );

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;

      // Obtener información de la cuenta
      const accountResponse = await fetch(
        `https://graph.facebook.com/v18.0/me?access_token=${accessToken}`
      );
      const accountData = await accountResponse.json();
      accountId = accountData.id;
      accountName = accountData.name || accountData.username || 'Cuenta conectada';
    }

    // Guardar integración
    await createSocialIntegration({
      tenantId: auth.tenantId,
      platform: platform as any,
      accountId,
      accountName,
      accessToken,
      status: 'active',
      permissions: [],
    });

    return NextResponse.redirect('/settings/integrations?success=connected');
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect('/settings/integrations?error=connection_failed');
  }
}





