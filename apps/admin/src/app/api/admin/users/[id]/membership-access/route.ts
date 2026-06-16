import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getAdminMembershipAccessStatus,
  grantAdminMembershipAccess,
  requireAdminMembershipSelection,
  markUserAsAdminProvisioned,
} from '@/lib/admin-membership-grant-server';

export const dynamic = 'force-dynamic';

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
    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const access = await getAdminMembershipAccessStatus(id);
    return NextResponse.json({ access });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('admin membership-access GET:', e);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const body = (await request.json()) as { action?: string; membershipId?: string };
    const action = typeof body.action === 'string' ? body.action.trim() : '';

    if (action === 'grant') {
      const membershipId =
        typeof body.membershipId === 'string' ? body.membershipId.trim() : '';
      if (!membershipId) {
        return NextResponse.json({ error: 'Selecciona una membresía' }, { status: 400 });
      }
      const result = await grantAdminMembershipAccess({
        userId: id,
        membershipId,
        grantedByAdminId: auth.userId,
      });
      const access = await getAdminMembershipAccessStatus(id);
      return NextResponse.json({
        success: true,
        subscriptionId: result.subscriptionId,
        access,
      });
    }

    if (action === 'require') {
      await requireAdminMembershipSelection({
        userId: id,
        adminUserId: auth.userId,
      });
      const access = await getAdminMembershipAccessStatus(id);
      return NextResponse.json({ success: true, access });
    }

    if (action === 'mark-provisioned') {
      await markUserAsAdminProvisioned(id, auth.userId);
      const access = await getAdminMembershipAccessStatus(id);
      return NextResponse.json({ success: true, access });
    }

    return NextResponse.json(
      { error: 'Acción inválida. Usa action: "grant" o "require".' },
      { status: 400 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al actualizar membresía';
    const details = e instanceof Error && e.stack ? e.stack.split('\n')[0] : msg;
    console.error('admin membership-access POST:', e);
    return NextResponse.json({ error: msg, details: msg }, { status: 400 });
  }
}
