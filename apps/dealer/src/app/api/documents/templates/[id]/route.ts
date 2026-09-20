export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  getDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  duplicateDocumentTemplate,
} from '@autodealers/core';

async function requireDealer(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth?.tenantId || !isDealerPortalRole(auth.role)) return null;
  return auth;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireDealer(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const template = await getDocumentTemplate(auth.tenantId!, id);
    if (!template) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireDealer(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    if (body.action === 'duplicate') {
      const template = await duplicateDocumentTemplate(auth.tenantId!, id, auth.userId);
      return NextResponse.json({ template }, { status: 201 });
    }
    if (body.action === 'confirm_ai') {
      const template = await updateDocumentTemplate(auth.tenantId!, id, { aiDraft: false });
      return NextResponse.json({ template });
    }
    const template = await updateDocumentTemplate(auth.tenantId!, id, body);
    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireDealer(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await deleteDocumentTemplate(auth.tenantId!, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
