import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { generateVehicleSlideshowVideo } from '@autodealers/core';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: vehicleId } = await params;

    const result = await generateVehicleSlideshowVideo({
      tenantId: auth.tenantId,
      vehicleId,
    });

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      photosUsed: result.photosUsed,
      durationSeconds: result.durationSeconds,
    });
  } catch (error: unknown) {
    console.error('[dealer/vehicles/generate-video]', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    const status =
      message.includes('no encontrado') ? 404 : message.includes('al menos 2 fotos') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
