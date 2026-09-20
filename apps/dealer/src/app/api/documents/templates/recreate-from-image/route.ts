export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { recreateTemplateFromImage } from '@autodealers/core';

/**
 * Recrea plantilla desde foto. El cliente DEBE haber mostrado el aviso de aclaración
 * y enviar disclaimerAccepted=true.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    if (String(formData.get('disclaimerAccepted')) !== 'true') {
      return NextResponse.json(
        {
          error:
            'Debes aceptar la aclaración antes de subir o escanear: la IA no garantiza una copia 100% idéntica; el resultado es un borrador a revisar.',
        },
        { status: 400 }
      );
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo de imagen requerido' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Máximo 10 MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await recreateTemplateFromImage(
      auth.tenantId,
      auth.userId,
      buffer,
      file.type || 'image/jpeg',
      file.name || 'scan.jpg'
    );

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('recreate-from-image', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
