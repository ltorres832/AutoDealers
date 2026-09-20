export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  listDocumentTemplates,
  createDocumentTemplate,
  seedDocumentTemplatesIfEmpty,
} from '@autodealers/core';

async function requireDealer(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth?.tenantId || !isDealerPortalRole(auth.role)) return null;
  return auth;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireDealer(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    if (searchParams.get('seed') === '1') {
      const result = await seedDocumentTemplatesIfEmpty(auth.tenantId!, auth.userId);
      return NextResponse.json(result);
    }

    const templates = await listDocumentTemplates(auth.tenantId!, {
      includeInactive: searchParams.get('all') === '1',
    });
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('documents templates GET', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireDealer(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (body.action === 'seed') {
      const result = await seedDocumentTemplatesIfEmpty(
        auth.tenantId!,
        auth.userId,
        Boolean(body.force)
      );
      return NextResponse.json(result);
    }

    if (!body.name || !body.type || !body.engine) {
      return NextResponse.json(
        { error: 'name, type y engine son requeridos' },
        { status: 400 }
      );
    }

    const template = await createDocumentTemplate(auth.tenantId!, auth.userId, body);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('documents templates POST', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
