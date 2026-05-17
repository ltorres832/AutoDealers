import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySubdomain } from '@autodealers/core';
import { getFirestore } from '../../../../../lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cliente consulta confirmación de cita con leadId + token (sin login). */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');
    const leadId = searchParams.get('leadId');
    const token = searchParams.get('token');
    if (!subdomain || !leadId || !token) {
      return NextResponse.json({ error: 'Parámetros incompletos' }, { status: 400 });
    }

    const tenant = await getTenantBySubdomain(subdomain);
    if (!tenant) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const tenantId = (tenant as { id: string }).id;
    const db = getFirestore();
    const leadRef = db.collection('tenants').doc(tenantId).collection('leads').doc(leadId);
    const snap = await leadRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    const data = snap.data();
    if (data?.publicTrackingToken !== token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const n = data?.clientAppointmentNotification;
    return NextResponse.json({
      clientAppointmentNotification: n
        ? {
            ...n,
            at: typeof n?.at?.toDate === 'function' ? n.at.toDate().toISOString() : n?.at,
          }
        : null,
    });
  } catch (e) {
    console.error('GET appointment public status', e);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
