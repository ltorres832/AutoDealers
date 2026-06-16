import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  clearPlatformMetaOAuthPending,
  getPlatformMetaOAuthPending,
  savePlatformFacebookIntegration,
} from '@/lib/platform-meta-oauth';
import {
  getPlatformSocialSettings,
  isAllowedPlatformFacebookPage,
} from '@/lib/platform-facebook-config';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = (await request.json()) as { pageId?: string };
    const pageId = typeof body.pageId === 'string' ? body.pageId.trim() : '';
    if (!pageId) {
      return NextResponse.json({ error: 'Selecciona una página' }, { status: 400 });
    }

    const pending = await getPlatformMetaOAuthPending();
    if (!pending) {
      return NextResponse.json(
        { error: 'No hay conexión pendiente. Vuelve a conectar Facebook.' },
        { status: 400 }
      );
    }

    const selected = pending.pages.find((p) => p.id === pageId);
    if (!selected?.access_token) {
      return NextResponse.json({ error: 'Página no válida' }, { status: 400 });
    }

    const settings = await getPlatformSocialSettings();
    const allowed = isAllowedPlatformFacebookPage(selected.id, settings);
    if (!allowed.allowed) {
      return NextResponse.json({ error: allowed.reason || 'Página no permitida' }, { status: 400 });
    }

    await savePlatformFacebookIntegration({
      accessToken: pending.accessToken,
      pageId: selected.id,
      pageName: selected.name,
      pageAccessToken: selected.access_token,
      pagesStored: pending.pagesDisplay,
      primaryAdAccountId: pending.primaryAdAccountId || undefined,
      leadOwnerUserId: pending.leadOwnerUserId || undefined,
    });

    await clearPlatformMetaOAuthPending();

    return NextResponse.json({
      success: true,
      pageName: selected.name,
      pageId: selected.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
