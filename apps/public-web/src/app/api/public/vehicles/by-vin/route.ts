import { NextRequest, NextResponse } from 'next/server';
import { normalizeVin, toVinNormalized } from '@autodealers/core';
import { findVehiclesByVin, getVehicleById } from '@autodealers/inventory';
import { getFirestore } from '@/lib/firebase-admin';
import { normalizeVehiclesArray } from '@/lib/vehicle-photos-normalize';
import {
  isTenantEligibleForPublicCatalog,
  isVehicleVisibleOnPublicListing,
} from '@/lib/public-catalog-visibility';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function publicHref(tenantId: string, vehicleId: string, sellerId?: string): string {
  const params = new URLSearchParams();
  if (sellerId?.trim()) params.set('sellerId', sellerId.trim());
  const qs = params.toString();
  return `/${tenantId}/vehicle/${vehicleId}${qs ? `?${qs}` : ''}`;
}

/**
 * GET /api/public/vehicles/by-vin?vin=...
 * Busca listados públicos en la plataforma por VIN (no es decode NHTSA).
 */
export async function GET(request: NextRequest) {
  try {
    const vinRaw = request.nextUrl.searchParams.get('vin') || '';
    const vinNormalized = toVinNormalized(vinRaw);
    if (!vinNormalized) {
      return NextResponse.json(
        {
          error: 'VIN inválido o incompleto',
          vin: normalizeVin(vinRaw) || null,
        },
        { status: 400 }
      );
    }

    const matches = await findVehiclesByVin(vinNormalized);
    if (matches.length === 0) {
      return NextResponse.json({
        vinNormalized,
        total: 0,
        vehicles: [],
      });
    }

    const db = getFirestore();
    const tenantIds = [...new Set(matches.map((m) => m.tenantId))];
    const tenantSnaps = await Promise.all(
      tenantIds.map((id) => db.collection('tenants').doc(id).get())
    );
    const tenantMeta = new Map<
      string,
      { eligible: boolean; hasActiveMembership: boolean; name: string }
    >();
    tenantSnaps.forEach((snap, i) => {
      const id = tenantIds[i];
      const data = (snap.exists ? snap.data() : {}) as Record<string, unknown>;
      tenantMeta.set(id, {
        eligible: snap.exists && isTenantEligibleForPublicCatalog(data, id),
        hasActiveMembership: Boolean(
          data.membershipId ||
            data.subscriptionId ||
            data.adminMembershipAccess === 'granted' ||
            data.adminMembershipAccess === 'active'
        ),
        name: String(data.name || data.companyName || ''),
      });
    });

    const loaded = await Promise.all(
      matches.map(async (m) => {
        const meta = tenantMeta.get(m.tenantId);
        if (!meta?.eligible) return null;
        try {
          const vehicle = await getVehicleById(m.tenantId, m.vehicleId);
          if (!vehicle) return null;
          const payload = {
            ...vehicle,
            tenantId: m.tenantId,
            tenantHasActiveMembership: meta.hasActiveMembership,
          } as Record<string, unknown>;
          if (!isVehicleVisibleOnPublicListing(payload as any)) return null;
          const sellerId =
            typeof vehicle.sellerId === 'string' ? vehicle.sellerId : undefined;
          return {
            ...payload,
            tenantName: meta.name,
            href: publicHref(m.tenantId, m.vehicleId, sellerId),
          };
        } catch (err) {
          console.warn(`by-vin: skip ${m.tenantId}/${m.vehicleId}`, err);
          return null;
        }
      })
    );

    const vehicles = normalizeVehiclesArray(
      loaded.filter((v): v is NonNullable<typeof v> => v != null)
    );

    return NextResponse.json(
      {
        vinNormalized,
        total: vehicles.length,
        vehicles,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error: unknown) {
    console.error('GET /api/public/vehicles/by-vin:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
