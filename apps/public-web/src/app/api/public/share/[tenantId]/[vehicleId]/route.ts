import { NextRequest, NextResponse } from 'next/server';
import { getShareLandingPayload } from '@autodealers/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; vehicleId: string }> }
) {
  try {
    const { tenantId, vehicleId } = await params;
    if (!tenantId?.trim() || !vehicleId?.trim()) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const payload = await getShareLandingPayload(tenantId.trim(), vehicleId.trim());
    if (!payload) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (error: unknown) {
    console.error('GET /api/public/share/[tenantId]/[vehicleId]', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
