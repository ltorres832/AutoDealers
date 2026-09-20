export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getVehicles } from '@autodealers/inventory';
import { getFirestore } from '@autodealers/core';

/**
 * Inventario consolidado multi-dealer: todos los vehículos de las sedes
 * autorizadas del usuario (principal + asociadas + red), con nombre de sede.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantIds = new Set<string>();
    if (auth.primaryTenantId) tenantIds.add(auth.primaryTenantId);
    for (const id of auth.associatedDealers || []) {
      if (typeof id === 'string' && id.trim()) tenantIds.add(id.trim());
    }
    for (const id of auth.tenantIds || []) {
      if (typeof id === 'string' && id.trim()) tenantIds.add(id.trim());
    }

    const db = getFirestore();
    const dealers: { id: string; name: string }[] = [];
    const vehicles: Record<string, unknown>[] = [];

    for (const tenantId of tenantIds) {
      let dealerName = tenantId;
      try {
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        dealerName = tenantDoc.data()?.name || tenantDoc.data()?.companyName || tenantId;
      } catch {
        // usar el ID como nombre
      }
      dealers.push({ id: tenantId, name: dealerName });

      try {
        const list = await getVehicles(tenantId, { limit: 8000 });
        for (const v of list) {
          if ((v as any).deleted === true) continue;
          vehicles.push({
            ...(v as unknown as Record<string, unknown>),
            id: v.id,
            tenantId,
            dealerName,
            createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
            updatedAt: v.updatedAt instanceof Date ? v.updatedAt.toISOString() : v.updatedAt,
            soldAt: v.soldAt instanceof Date ? v.soldAt.toISOString() : v.soldAt,
          });
        }
      } catch (error) {
        console.warn('network-inventory: error cargando tenant', tenantId, error);
      }
    }

    return NextResponse.json({ dealers, vehicles, total: vehicles.length });
  } catch (error) {
    console.error('network-inventory error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
