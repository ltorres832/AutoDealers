export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  assignAdvertiserToAdmin,
  getAdvertiserById,
  resolvePlatformAdminName,
  type Advertiser,
} from '@autodealers/core';
import { adminDeleteAdvertiser } from '@autodealers/core/admin-platform-delete';

function serializeAdvertiser(advertiser: Advertiser) {
  return {
    ...advertiser,
    createdAt:
      advertiser.createdAt instanceof Date
        ? advertiser.createdAt.toISOString()
        : advertiser.createdAt,
    updatedAt:
      advertiser.updatedAt instanceof Date
        ? advertiser.updatedAt.toISOString()
        : advertiser.updatedAt,
    assignedAt:
      advertiser.assignedAt instanceof Date
        ? advertiser.assignedAt.toISOString()
        : advertiser.assignedAt,
    lastLogin:
      advertiser.lastLogin instanceof Date
        ? advertiser.lastLogin.toISOString()
        : advertiser.lastLogin,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(_request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const advertiser = await getAdvertiserById(id);
    if (!advertiser) {
      return NextResponse.json({ error: 'Anunciante no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ advertiser: serializeAdvertiser(advertiser) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { assignedAdminId } = body as { assignedAdminId?: string | null };

    if (assignedAdminId === undefined) {
      return NextResponse.json({ error: 'assignedAdminId requerido' }, { status: 400 });
    }

    const normalized =
      assignedAdminId === null || assignedAdminId === ''
        ? null
        : String(assignedAdminId).trim();

    if (normalized) {
      const name = await resolvePlatformAdminName(normalized);
      if (!name) {
        return NextResponse.json({ error: 'Administrador no encontrado' }, { status: 404 });
      }
    }

    const advertiser = await assignAdvertiserToAdmin(id, normalized, auth.userId);
    if (!advertiser) {
      return NextResponse.json({ error: 'Anunciante no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      advertiser: serializeAdvertiser(advertiser),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const permanent = request.nextUrl.searchParams.get('permanent') === 'true';
    await adminDeleteAdvertiser(id, { permanent });
    return NextResponse.json({ success: true, permanent });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al eliminar anunciante';
    const status = message.includes('no encontrado') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
