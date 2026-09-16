export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  findActiveVinConflicts,
  findVehiclesByVin,
} from '@autodealers/inventory';
import { normalizeVin, toVinNormalized } from '@autodealers/core';

/**
 * GET /api/admin/vin-conflicts?vin=...
 * Lista listados con el mismo VIN (todos o solo activos) para auditoría multi-dealer.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vin = searchParams.get('vin') || '';
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const vinNormalized = toVinNormalized(vin);
    if (!vinNormalized) {
      return NextResponse.json(
        {
          error: 'VIN inválido o ausente',
          vin: normalizeVin(vin) || null,
        },
        { status: 400 }
      );
    }

    const matches = activeOnly
      ? await findActiveVinConflicts(vinNormalized)
      : await findVehiclesByVin(vinNormalized);

    const byTenant = new Map<string, typeof matches>();
    for (const m of matches) {
      const list = byTenant.get(m.tenantId) || [];
      list.push(m);
      byTenant.set(m.tenantId, list);
    }

    return NextResponse.json({
      vinNormalized,
      activeOnly,
      total: matches.length,
      tenantCount: byTenant.size,
      hasMultiTenantConflict: byTenant.size > 1,
      matches,
    });
  } catch (error) {
    console.error('GET /api/admin/vin-conflicts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
