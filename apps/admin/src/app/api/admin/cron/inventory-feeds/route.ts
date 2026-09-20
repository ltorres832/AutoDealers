export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { getFirestore } from '@autodealers/shared';
import { runFeedJob } from '@autodealers/inventory';

/**
 * Cron: sincroniza feeds de inventario habilitados (create/update, nunca delete).
 */
export async function POST(request: NextRequest) {
  const denied = await authorizeCronRequest(request);
  if (denied) return denied;

  try {
    const db = getFirestore();
    const snaps = await db
      .collectionGroup('inventory_feed_jobs')
      .where('enabled', '==', true)
      .limit(200)
      .get();

    const byTenant = new Map<string, string[]>();
    for (const doc of snaps.docs) {
      const tenantId = doc.ref.parent.parent?.id;
      if (!tenantId) continue;
      if (!byTenant.has(tenantId)) byTenant.set(tenantId, []);
      byTenant.get(tenantId)!.push(doc.id);
    }

    let ok = 0;
    let fail = 0;
    const errors: Array<{ tenantId: string; jobId: string; error: string }> = [];

    for (const [tenantId, jobIds] of byTenant) {
      for (const jobId of jobIds) {
        try {
          await runFeedJob(tenantId, jobId, true);
          ok += 1;
        } catch (error) {
          fail += 1;
          errors.push({
            tenantId,
            jobId,
            error: error instanceof Error ? error.message : 'Error',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      tenants: byTenant.size,
      ok,
      fail,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    console.error('inventory-feeds cron:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
