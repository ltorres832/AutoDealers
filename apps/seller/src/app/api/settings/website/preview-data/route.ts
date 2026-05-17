import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  filterSellerPublicCatalogVehicles,
  filterSellerWorkspaceInventory,
  loadVehiclesForSellerWorkspace,
  slimVehicleForPreview,
} from '@/lib/seller-vehicles';

export const dynamic = 'force-dynamic';

/**
 * Inventario real del vendedor para la vista previa (misma fuente que /api/vehicles del panel).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const all = await loadVehiclesForSellerWorkspace(auth);
    const vehicles = filterSellerPublicCatalogVehicles(all, auth.userId, {
      tenantPrimarySellerId: auth.userId,
    });
    const workspace = filterSellerWorkspaceInventory(all, auth.userId);
    const slim = vehicles.slice(0, 48).map(slimVehicleForPreview);

    return NextResponse.json(
      {
        vehicles: slim,
        counts: {
          workspace: workspace.length,
          publicCatalog: vehicles.length,
        },
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error';
    console.error('[preview-data]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
