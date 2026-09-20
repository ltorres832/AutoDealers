export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  getVehiclePhotoSet,
  upsertVehiclePhotoSlot,
  setVehiclePhotoEdited,
  buildVehicleSharePath,
  buildQrImageUrl,
  buildDacoLabelHtml,
  getShareLandingPayload,
  resolveDacoLabelSettings,
} from '@autodealers/inventory';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { resolvePublicWebUrl } from '@autodealers/shared/platform-urls';

type Ctx = { params: Promise<{ id: string }> };

async function requireDealer(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) return null;
  return auth;
}

async function buildLabelHtmlResponse(tenantId: string, vehicleId: string) {
  const payload = await getShareLandingPayload(tenantId, vehicleId);
  if (!payload) return null;
  const origin = resolvePublicWebUrl().replace(/\/$/, '');
  const absolute = `${origin}${payload.sharePath}`;
  const notes = await resolveDacoLabelSettings(tenantId);
  const html = buildDacoLabelHtml({
    dealerName: payload.dealer.name,
    year: payload.vehicle.year,
    make: payload.vehicle.make,
    model: payload.vehicle.model,
    price: payload.vehicle.price,
    currency: payload.vehicle.currency,
    vin: payload.vehicle.vin,
    stockNumber: payload.vehicle.stockNumber,
    mileage: payload.vehicle.mileage,
    shareAbsoluteUrl: absolute,
    warrantyNote: notes.warrantyNote,
    footerNote: notes.footerNote,
  });
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET(request: NextRequest, context: Ctx) {
  const auth = await requireDealer(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind') || 'photos';

  try {
    if (kind === 'share') {
      const payload = await getShareLandingPayload(auth.tenantId!, id);
      if (!payload) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
      const origin = resolvePublicWebUrl().replace(/\/$/, '');
      const absolute = `${origin}${payload.sharePath}`;
      return NextResponse.json({
        ...payload,
        absoluteUrl: absolute,
        qrImageUrl: buildQrImageUrl(absolute),
        whatsappShareUrl: payload.dealer.whatsapp
          ? `https://wa.me/${payload.dealer.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Mira este vehículo: ${absolute}`)}`
          : `https://wa.me/?text=${encodeURIComponent(`Mira este vehículo: ${absolute}`)}`,
      });
    }

    if (kind === 'label' || kind === 'daco_label') {
      const response = await buildLabelHtmlResponse(auth.tenantId!, id);
      if (!response) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
      return response;
    }

    const set = await getVehiclePhotoSet(auth.tenantId!, id);
    return NextResponse.json({
      success: true,
      ...set,
      sharePath: buildVehicleSharePath(auth.tenantId!, id),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest, context: Ctx) {
  const auth = await requireDealer(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await context.params;

  try {
    const body = await request.json();
    const action = String(body.action || 'upsert_slot');

    if (action === 'daco_label' || action === 'label') {
      const response = await buildLabelHtmlResponse(auth.tenantId!, id);
      if (!response) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
      return response;
    }

    if (action === 'set_edited') {
      const result = await setVehiclePhotoEdited({
        tenantId: auth.tenantId!,
        vehicleId: id,
        angleId: String(body.angleId || ''),
        editedUrl: String(body.editedUrl || ''),
        sceneId: body.sceneId ? String(body.sceneId) : null,
      });
      return NextResponse.json({ success: true, ...result });
    }

    const result = await upsertVehiclePhotoSlot({
      tenantId: auth.tenantId!,
      vehicleId: id,
      angleId: String(body.angleId || ''),
      originalUrl: String(body.originalUrl || ''),
      editedUrl: body.editedUrl ? String(body.editedUrl) : null,
      sceneId: body.sceneId ? String(body.sceneId) : null,
      appendToVehiclePhotos: body.appendToVehiclePhotos !== false,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
