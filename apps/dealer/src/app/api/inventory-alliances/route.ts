export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  listAlliancesForTenant,
  createAllianceInvite,
  respondAlliance,
  listAlliedVehiclesForTenant,
} from '@autodealers/inventory';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getFirestore } from '@autodealers/shared';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const includeVehicles = request.nextUrl.searchParams.get('vehicles') === '1';
  const [alliances, alliedVehicles] = await Promise.all([
    listAlliancesForTenant(auth.tenantId),
    includeVehicles ? listAlliedVehiclesForTenant(auth.tenantId) : Promise.resolve([]),
  ]);
  return NextResponse.json({ alliances, alliedVehicles });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const action = String(body.action || 'invite');

    if (action === 'respond') {
      const alliance = await respondAlliance(
        String(body.allianceId || ''),
        auth.tenantId,
        body.accept === true
      );
      return NextResponse.json({ success: true, alliance });
    }

    if (action === 'lookup') {
      const emailOrId = String(body.query || '').trim().toLowerCase();
      if (!emailOrId) return NextResponse.json({ error: 'Indica email o ID del dealer' }, { status: 400 });
      const db = getFirestore();
      let tenantId = '';
      let name = '';
      if (emailOrId.includes('@')) {
        const users = await db.collection('users').where('email', '==', emailOrId).limit(5).get();
        for (const doc of users.docs) {
          const u = doc.data();
          if (u.tenantId && (u.role === 'dealer' || u.type === 'dealer')) {
            tenantId = String(u.tenantId);
            break;
          }
        }
        if (!tenantId) {
          return NextResponse.json({ error: 'No se encontró un dealer con ese email' }, { status: 404 });
        }
      } else {
        tenantId = emailOrId;
      }
      const tenant = await db.collection('tenants').doc(tenantId).get();
      if (!tenant.exists) return NextResponse.json({ error: 'Dealer no encontrado' }, { status: 404 });
      name = String(tenant.data()?.name || tenant.data()?.companyName || tenantId);
      return NextResponse.json({ tenantId, name });
    }

    const alliance = await createAllianceInvite({
      fromTenantId: auth.tenantId,
      toTenantId: String(body.toTenantId || ''),
      shareAll: body.shareAll !== false,
      vehicleIds: Array.isArray(body.vehicleIds) ? body.vehicleIds.map(String) : [],
    });
    return NextResponse.json({ success: true, alliance });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
