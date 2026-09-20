import { NextRequest, NextResponse } from 'next/server';
import { authenticateV0Request, requireScope } from '@/lib/public-api-auth';
import { getVehicles } from '@autodealers/inventory';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateV0Request(request);
  if (!auth.ok) return auth.response;
  const denied = requireScope(auth.scopes, 'vehicles:read');
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const limit = Math.min(200, Number(searchParams.get('limit') || 50));
  const vehicles = await getVehicles(auth.tenantId);
  const filtered = status
    ? vehicles.filter((v: any) => v.status === status)
    : vehicles;
  return NextResponse.json({
    data: filtered.slice(0, limit).map((v: any) => ({
      id: v.id,
      make: v.make,
      model: v.model,
      year: v.year,
      price: v.price,
      status: v.status,
      vin: v.vin,
      stockNumber: v.stockNumber || v.specifications?.stockNumber,
      mileage: v.mileage,
      photos: v.photos,
    })),
  });
}
