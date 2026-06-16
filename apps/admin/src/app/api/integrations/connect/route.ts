export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { encodeSocialOAuthState, getFirestore, PLATFORM_SOCIAL_TENANT_ID } from '@autodealers/core';
import { buildMetaOAuthDialogUrl } from '@autodealers/core/meta-oauth-scopes';
import { getOAuthRedirectOrigin } from '@/lib/oauth-redirect-origin';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { platform, reauthorize } = body as { platform?: string; reauthorize?: boolean };

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

    const baseUrl = getOAuthRedirectOrigin(request);
    const redirectUri = `${baseUrl}/api/integrations/callback`;

    const statePayload = encodeSocialOAuthState({
      type: platform,
      tenantId,
      leadOwnerUserId: auth.userId ?? '',
    });

    const authUrl = buildMetaOAuthDialogUrl({
      appId,
      redirectUri,
      state: statePayload,
      type: platform === 'instagram' ? 'instagram' : 'facebook',
      reauthorize: reauthorize === true,
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error connecting platform:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
