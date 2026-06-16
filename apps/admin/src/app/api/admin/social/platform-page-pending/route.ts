import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getPlatformMetaOAuthPending, clearPlatformMetaOAuthPending } from '@/lib/platform-meta-oauth';
import {
  getPlatformSocialSettings,
  isAllowedPlatformFacebookPage,
  isBlockedPlatformFacebookPage,
} from '@/lib/platform-facebook-config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [pending, settings] = await Promise.all([
      getPlatformMetaOAuthPending(),
      getPlatformSocialSettings(),
    ]);

    if (!pending) {
      return NextResponse.json({ pending: false, pages: [], settings });
    }

    const pages = pending.pages.map((p) => ({
      id: p.id,
      name: p.name,
      blocked: isBlockedPlatformFacebookPage(p.id),
      allowed: isAllowedPlatformFacebookPage(p.id, settings).allowed,
    }));

    return NextResponse.json({
      pending: true,
      pages,
      settings,
      hasAllowedPage: pages.some((p) => p.allowed),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    await clearPlatformMetaOAuthPending();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
