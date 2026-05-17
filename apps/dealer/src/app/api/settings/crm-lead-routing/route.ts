import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { getCrmLeadRoutingConfig } from '@autodealers/crm';
import type { CrmSourceRuleEntry } from '@autodealers/crm';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

const DOC = 'crm_lead_routing';

const ALLOWED_SOURCES = new Set([
  'whatsapp',
  'facebook',
  'instagram',
  'web',
  'email',
  'sms',
  'phone',
  'admin_manual',
  'manual',
]);

function sanitizeSourceRules(raw: unknown): Record<string, CrmSourceRuleEntry> {
  const out: Record<string, CrmSourceRuleEntry> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!ALLOWED_SOURCES.has(k)) continue;
    if (!v || typeof v !== 'object') continue;
    const vo = v as Record<string, unknown>;
    const poolRaw = vo.poolUserIds;
    const poolUserIds = Array.isArray(poolRaw)
      ? poolRaw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())
      : [];
    out[k] = {
      useDedicatedPool: vo.useDedicatedPool === true,
      poolUserIds,
    };
  }
  return out;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getCrmLeadRoutingConfig(auth.tenantId);
    return NextResponse.json({ config });
  } catch (e: unknown) {
    console.error('[crm-lead-routing] GET', e);
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
    const enabled = body.enabled === true;
    const strategy = body.strategy === 'round_robin' ? 'round_robin' : 'none';
    const poolRaw = body.poolUserIds;
    const poolUserIds = Array.isArray(poolRaw)
      ? poolRaw.filter((x: unknown) => typeof x === 'string' && String(x).trim()).map((x: string) => x.trim())
      : [];

    const sourceRules = sanitizeSourceRules(body.sourceRules);

    const cursorsRaw = body.roundRobinCursors;
    const roundRobinCursors: Record<string, number> = {};
    if (cursorsRaw && typeof cursorsRaw === 'object') {
      for (const [k, v] of Object.entries(cursorsRaw as Record<string, unknown>)) {
        if (ALLOWED_SOURCES.has(k) && typeof v === 'number' && v >= 0) {
          roundRobinCursors[k] = Math.floor(v);
        }
      }
    }

    const db = getFirestore();
    const payload: Record<string, unknown> = {
      enabled,
      strategy,
      poolUserIds,
      sourceRules,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: auth.userId,
    };
    if (Object.keys(roundRobinCursors).length > 0) {
      payload.roundRobinCursors = roundRobinCursors;
    }

    await db.collection('tenants').doc(auth.tenantId).collection('settings').doc(DOC).set(payload, { merge: true });

    const config = await getCrmLeadRoutingConfig(auth.tenantId);
    return NextResponse.json({ success: true, config });
  } catch (e: unknown) {
    console.error('[crm-lead-routing] PUT', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
