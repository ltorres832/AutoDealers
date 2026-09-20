export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getDealerSite, saveDealerSite, DEALER_SITE_TEMPLATES, buildDealerSitePath } from '@autodealers/inventory';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { resolvePublicWebUrl } from '@autodealers/shared/platform-urls';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const site = await getDealerSite(auth.tenantId);
  const origin = resolvePublicWebUrl().replace(/\/$/, '');
  const slug = site?.slug || auth.tenantId;
  return NextResponse.json({
    site,
    templates: DEALER_SITE_TEMPLATES,
    publicUrl: site?.published ? `${origin}${buildDealerSitePath(slug)}` : null,
    previewUrl: `${origin}${buildDealerSitePath(slug)}`,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const site = await saveDealerSite(auth.tenantId, body);
    const origin = resolvePublicWebUrl().replace(/\/$/, '');
    return NextResponse.json({
      success: true,
      site,
      publicUrl: site.published ? `${origin}${buildDealerSitePath(site.slug)}` : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al guardar';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
