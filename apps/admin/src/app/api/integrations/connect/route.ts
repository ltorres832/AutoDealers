export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { encodeSocialOAuthState, getFirestore, PLATFORM_SOCIAL_TENANT_ID } from '@autodealers/core';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { platform } = body as { platform?: string };

    if (!platform || !['facebook', 'instagram'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    const tenantId =
      auth.role === 'admin' ? PLATFORM_SOCIAL_TENANT_ID : auth.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const credentialsDoc = await db.collection('system_settings').doc('credentials').get();
    let appId: string | undefined;
    if (credentialsDoc.exists) {
      appId = credentialsDoc.data()?.metaAppId;
    }

    if (!appId) {
      return NextResponse.json(
        {
          error: 'Credenciales no configuradas',
          message:
            'Configura App ID y App Secret de Meta en Integraciones Meta antes de conectar.',
        },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const redirectUri = `${baseUrl}/api/integrations/callback`;
    const scope =
      platform === 'facebook'
        ? 'pages_show_list,pages_manage_posts,pages_read_engagement,pages_messaging,instagram_basic,instagram_content_publish,ads_read,ads_management'
        : 'instagram_basic,instagram_content_publish,instagram_manage_messages,pages_show_list';

    const statePayload = encodeSocialOAuthState({
      type: platform,
      tenantId,
      leadOwnerUserId: auth.userId ?? '',
    });

    const authUrl =
      `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${scope}` +
      `&response_type=code` +
      `&state=${encodeURIComponent(statePayload)}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error connecting platform:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
