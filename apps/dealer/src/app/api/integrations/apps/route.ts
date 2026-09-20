import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  getIntegrationCatalog,
  listConnectedApps,
  registerConnectedApp,
  pauseConnectedApp,
  resumeConnectedApp,
} from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const catalog = await getIntegrationCatalog();
    const apps = await listConnectedApps(auth.tenantId);
    return NextResponse.json({ catalog, apps });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const action = String(body.action || 'register');

    if (action === 'register') {
      const result = await registerConnectedApp({
        tenantId: auth.tenantId,
        name: body.name,
        type: body.type || 'custom',
        targetUrl: body.targetUrl,
        events: Array.isArray(body.events) ? body.events : [],
        createdBy: auth.userId,
      });
      return NextResponse.json(result, { status: 201 });
    }

    if (action === 'pause') {
      await pauseConnectedApp(auth.tenantId, String(body.id));
      return NextResponse.json({ ok: true });
    }

    if (action === 'resume') {
      await resumeConnectedApp(auth.tenantId, String(body.id));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
