/**
 * Feed CSV de vehículos para el catálogo de Meta (Commerce, vertical vehicles).
 * Meta lo descarga cada hora (scheduled feed). Protegido con token por tenant
 * guardado en credentials.vehicleCatalog.feedToken de la integración de Facebook.
 *
 * Formato: https://developers.facebook.com/docs/marketing-api/auto-ads/vehicle-feed
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVehicles } from '@autodealers/inventory';
import { getTenantById, verifyVehicleFeedToken } from '@autodealers/core';
import { buildTenantSiteUrl, buildPublicWebUrl } from '@autodealers/shared/platform-urls';
import {
  isTenantEligibleForPublicCatalog,
  isVehicleVisibleOnPublicListing,
} from '@/lib/public-catalog-visibility';
import { getVehiclePhotosRaw } from '@/lib/vehicle-photos-normalize';

export const dynamic = 'force-dynamic';

const CSV_HEADERS = [
  'vehicle_id',
  'title',
  'description',
  'url',
  'make',
  'model',
  'year',
  'mileage.value',
  'mileage.unit',
  'image[0].url',
  'image[1].url',
  'image[2].url',
  'state_of_vehicle',
  'exterior_color',
  'price',
  'address',
  'body_style',
  'vin',
  'transmission',
  'fuel_type',
  'availability',
  'dealer_name',
  'dealer_phone',
] as const;

function csvEscape(value: string): string {
  const v = value.replace(/\r?\n/g, ' ').trim();
  if (v.includes(',') || v.includes('"')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function mapStateOfVehicle(condition?: string): string {
  const c = String(condition || '').toLowerCase();
  if (c === 'new') return 'NEW';
  if (c === 'certified') return 'CPO';
  return 'USED';
}

function mapBodyStyle(bodyType?: string): string {
  const b = String(bodyType || '').toLowerCase();
  const map: Record<string, string> = {
    suv: 'SUV',
    crossover: 'CROSSOVER',
    sedan: 'SEDAN',
    'pickup-truck': 'TRUCK',
    coupe: 'COUPE',
    hatchback: 'HATCHBACK',
    wagon: 'WAGON',
    convertible: 'CONVERTIBLE',
    minivan: 'MINIVAN',
    van: 'VAN',
  };
  return map[b] || 'OTHER';
}

function mapTransmission(t?: string): string {
  const v = String(t || '').toLowerCase();
  if (v === 'manual') return 'MANUAL';
  if (v === 'automatic' || v === 'cvt') return 'AUTOMATIC';
  return '';
}

function mapFuelType(f?: string): string {
  const v = String(f || '').toLowerCase();
  const map: Record<string, string> = {
    gasoline: 'GASOLINE',
    diesel: 'DIESEL',
    electric: 'ELECTRIC',
    hybrid: 'HYBRID',
    'plug-in-hybrid': 'HYBRID',
  };
  return map[v] || '';
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await context.params;
    const token = request.nextUrl.searchParams.get('token') || '';

    const authorized = await verifyVehicleFeedToken(tenantId, token);
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getTenantById(tenantId);
    if (!tenant || !isTenantEligibleForPublicCatalog(tenant as Record<string, unknown>, tenantId)) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const settings = (tenant.settings || {}) as Record<string, unknown>;
    const dealerName = String(tenant.name || '');
    const dealerPhone = String(tenant.contactPhone || settings.phone || '');
    const address = JSON.stringify({
      addr1: String(settings.address || ''),
      city: String(settings.city || ''),
      region: String(settings.state || settings.region || ''),
      postal_code: String(settings.zipCode || settings.postalCode || ''),
      country: String(settings.country || 'US'),
    });

    const subdomain = String(tenant.subdomain || '').trim();
    const vdpBase = subdomain
      ? buildTenantSiteUrl(subdomain)
      : buildPublicWebUrl(`/${tenantId}`);

    const vehicles = await getVehicles(tenantId);

    const rows: string[] = [CSV_HEADERS.join(',')];
    for (const vehicle of vehicles) {
      if (!isVehicleVisibleOnPublicListing(vehicle)) continue;
      const photos = getVehiclePhotosRaw(vehicle).filter(
        (p) => typeof p === 'string' && p.startsWith('http')
      );
      // Meta exige al menos una imagen por vehículo
      if (photos.length === 0) continue;

      const specs = vehicle.specifications || ({} as Record<string, unknown>);
      const make = String(vehicle.make || specs.make || '').trim();
      const model = String(vehicle.model || specs.model || '').trim();
      const year = Number(vehicle.year || specs.year || 0);
      const price = Number(vehicle.price || 0);
      if (!make || !model || !year || !price) continue;

      const mileage = Number(vehicle.mileage ?? specs.mileage ?? 0);
      const title = `${year} ${make} ${model}`.slice(0, 65);
      const description = String(vehicle.description || title).slice(0, 200);
      const url = `${vdpBase}/vehicle/${vehicle.id}`;
      const currency = String(vehicle.currency || 'USD').toUpperCase();

      const row = [
        vehicle.id,
        title,
        description,
        url,
        make,
        model,
        String(year),
        String(Math.max(0, Math.round(mileage))),
        'MI',
        photos[0] || '',
        photos[1] || '',
        photos[2] || '',
        mapStateOfVehicle(vehicle.condition),
        String(specs.color || 'N/D'),
        `${price.toFixed(2)} ${currency}`,
        address,
        mapBodyStyle(vehicle.bodyType || (specs.bodyType as string)),
        String(vehicle.vin || specs.vin || ''),
        mapTransmission(specs.transmission as string),
        mapFuelType(specs.fuelType as string),
        'AVAILABLE',
        dealerName,
        dealerPhone,
      ].map(csvEscape);

      rows.push(row.join(','));
    }

    return new NextResponse(rows.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating Meta vehicle feed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
