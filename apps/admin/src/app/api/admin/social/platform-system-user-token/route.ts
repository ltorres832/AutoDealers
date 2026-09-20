export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getPlatformMetaTokenHealthSummary,
  installPlatformSystemUserToken,
  PLATFORM_META_BUSINESS_ID,
  PLATFORM_META_PAGE_ID,
  PLATFORM_META_PREFERRED_AD_ACCOUNT_ID,
  PLATFORM_META_SYSTEM_USER_ID,
} from '@autodealers/core';

/**
 * GET — estado de tokens de plataforma (sin exponer secretos).
 * POST — instala System User token permanente en _platform facebook+instagram.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const health = await getPlatformMetaTokenHealthSummary();
    return NextResponse.json({
      health,
      defaults: {
        businessId: PLATFORM_META_BUSINESS_ID,
        systemUserId: PLATFORM_META_SYSTEM_USER_ID,
        pageId: PLATFORM_META_PAGE_ID,
        preferredAdAccountId: PLATFORM_META_PREFERRED_AD_ACCOUNT_ID,
        businessManagerUrl: `https://business.facebook.com/settings/system-users/${PLATFORM_META_SYSTEM_USER_ID}?business_id=${PLATFORM_META_BUSINESS_ID}`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      systemUserAccessToken?: string;
      pageId?: string;
      adAccountId?: string;
      systemUserId?: string;
      businessId?: string;
    };

    const result = await installPlatformSystemUserToken({
      systemUserAccessToken: body.systemUserAccessToken || '',
      pageId: body.pageId,
      adAccountId: body.adAccountId,
      systemUserId: body.systemUserId,
      businessId: body.businessId,
      leadOwnerUserId: auth.userId,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      ...result,
      message: result.tokenNeverExpires
        ? 'System User instalado. Tokens de plataforma sin vencimiento (hasta revocación manual).'
        : 'Token instalado, pero Meta aún reporta vencimiento de data access. Regenera el token desde Business Manager → System Users (no uses OAuth de usuario).',
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
