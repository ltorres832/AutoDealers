import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  updateEmailSignature,
  resetEmailPassword,
} from '@autodealers/crm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (body.signature !== undefined) {
      // Actualizar firma
      await updateEmailSignature(
        id,
        auth.tenantId,
        body.signature,
        body.signatureType || 'basic'
      );

      return NextResponse.json({ success: true });
    }

    if (body.password !== undefined) {
      // Cambiar contraseña
      if (!body.password || typeof body.password !== 'string' || body.password.length < 8) {
        return NextResponse.json(
          { error: 'La contraseña debe tener al menos 8 caracteres' },
          { status: 400 }
        );
      }

      await resetEmailPassword(id, auth.tenantId, body.password);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'No se especificó acción válida' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error updating corporate email:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


