import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { getCrmSlaConfig, DEFAULT_CRM_SLA, type CrmSlaConfig } from '@autodealers/crm';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

const DOC = 'crm_sla';

function clampHours(n: unknown, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.min(720, Math.max(1, Math.floor(n)));
}

function clampMult(n: unknown, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.min(5, Math.max(1.1, n));
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const config = await getCrmSlaConfig(auth.tenantId);
    return NextResponse.json({ config });
  } catch (e) {
    console.error('[crm-sla] GET', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const payload: CrmSlaConfig = {
      enabled: body.enabled !== false,
      staleHoursNew: clampHours(body.staleHoursNew, DEFAULT_CRM_SLA.staleHoursNew),
      staleHoursActive: clampHours(body.staleHoursActive, DEFAULT_CRM_SLA.staleHoursActive),
      criticalMultiplier: clampMult(body.criticalMultiplier, DEFAULT_CRM_SLA.criticalMultiplier),
    };

    const db = getFirestore();
    await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('settings')
      .doc(DOC)
      .set(
        {
          ...payload,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: auth.userId,
        },
        { merge: true }
      );

    const config = await getCrmSlaConfig(auth.tenantId);
    return NextResponse.json({ success: true, config });
  } catch (e) {
    console.error('[crm-sla] PUT', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
