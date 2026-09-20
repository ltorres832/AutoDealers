export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { removeBackgroundAndApplyScene, hasBackgroundRemovalApiConfigured } from '@autodealers/inventory/photo-ai';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET() {
  return NextResponse.json({
    configured: hasBackgroundRemovalApiConfigured(),
    providers: ['REMOVE_BG_API_KEY', 'PHOTOROOM_API_KEY'],
  });
}

export async function POST(request: NextRequest, context: Ctx) {
  const auth = await verifyAuth(request);
  if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    if (!hasBackgroundRemovalApiConfigured()) {
      return NextResponse.json(
        {
          error:
            'Configura REMOVE_BG_API_KEY o PHOTOROOM_API_KEY en App Hosting para quitar el fondo automáticamente. Mientras, puedes usar el botón local en el navegador.',
          code: 'NO_API_KEY',
        },
        { status: 503 }
      );
    }
    const body = await request.json();
    const result = await removeBackgroundAndApplyScene({
      tenantId: auth.tenantId,
      vehicleId: id,
      angleId: String(body.angleId || ''),
      sceneId: body.sceneId ? String(body.sceneId) : 'white',
      sourceUrl: body.sourceUrl ? String(body.sourceUrl) : undefined,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al quitar fondo';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
