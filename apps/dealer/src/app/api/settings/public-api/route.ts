import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  createTenantApiKey,
  listTenantApiKeys,
  revokeTenantApiKey,
  createOutboundWebhook,
  listOutboundWebhooks,
  deleteOutboundWebhook,
} from '@autodealers/core';
import { getTenantMembershipFeatures } from '@autodealers/core';

export const dynamic = 'force-dynamic';

async function requirePublicApi(tenantId: string) {
  const features = await getTenantMembershipFeatures(tenantId);
  // Opt-out: ausente = permitir en desarrollo de Fase 2; false = bloquear
  if (features && features.publicApiEnabled === false) {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await requirePublicApi(auth.tenantId))) {
      return NextResponse.json(
        { error: 'API pública no incluida en tu membresía' },
        { status: 403 }
      );
    }

    const [keys, webhooks] = await Promise.all([
      listTenantApiKeys(auth.tenantId),
      listOutboundWebhooks(auth.tenantId),
    ]);

    return NextResponse.json({
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        scopes: k.scopes,
        active: k.active,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      })),
      webhooks: webhooks.map((w) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        active: w.active,
        secret: w.secret,
        createdAt: w.createdAt,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await requirePublicApi(auth.tenantId))) {
      return NextResponse.json(
        { error: 'API pública no incluida en tu membresía' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const kind = String(body.kind || 'api_key');

    if (kind === 'webhook') {
      const webhook = await createOutboundWebhook({
        tenantId: auth.tenantId,
        url: String(body.url || ''),
        events: Array.isArray(body.events) ? body.events.map(String) : [],
        createdBy: auth.userId,
      });
      return NextResponse.json({ webhook }, { status: 201 });
    }

    const { record, rawKey } = await createTenantApiKey({
      tenantId: auth.tenantId,
      name: String(body.name || 'API key'),
      createdBy: auth.userId,
      scopes: Array.isArray(body.scopes) ? body.scopes.map(String) : undefined,
    });

    return NextResponse.json(
      {
        key: {
          id: record.id,
          name: record.name,
          keyPrefix: record.keyPrefix,
          scopes: record.scopes,
          createdAt: record.createdAt,
        },
        rawKey,
        warning: 'Guarda esta clave ahora; no se volverá a mostrar.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get('kind') || 'api_key';
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    if (kind === 'webhook') {
      await deleteOutboundWebhook(auth.tenantId, id);
    } else {
      await revokeTenantApiKey(auth.tenantId, id);
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
