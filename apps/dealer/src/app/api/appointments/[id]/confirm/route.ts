import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getAppointmentById, confirmAppointmentAndNotifyClient } from '@autodealers/crm';
import { getFirestore } from '@autodealers/shared';

export const dynamic = 'force-dynamic';

const DEALER_ROLES_CAN_CONFIRM_ANY = ['dealer', 'master_dealer', 'dealer_admin', 'manager'] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const apt = await getAppointmentById(auth.tenantId, id);
    if (!apt) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    const role = auth.role || '';
    const canConfirmAny = (DEALER_ROLES_CAN_CONFIRM_ANY as readonly string[]).includes(role);
    const isAssignee = apt.assignedTo === auth.userId;

    if (!canConfirmAny && !isAssignee) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const db = getFirestore();
    const u = await db.collection('users').doc(auth.userId).get();
    const name =
      (u.data()?.name as string) ||
      (u.data()?.displayName as string) ||
      auth.email ||
      'Equipo';

    const updated = await confirmAppointmentAndNotifyClient(auth.tenantId, id, {
      userId: auth.userId,
      name: String(name),
    });

    return NextResponse.json({
      appointment: {
        ...updated,
        scheduledAt: updated.scheduledAt.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        confirmedAt: updated.confirmedAt
          ? new Date(updated.confirmedAt).toISOString()
          : undefined,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal server error';
    console.error('appointments/confirm', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
