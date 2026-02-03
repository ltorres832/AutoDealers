import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  suspendCorporateEmail,
  activateCorporateEmail,
  deleteCorporateEmail,
  updateEmailSignature,
  resetEmailPassword,
} from '@autodealers/crm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: emailId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'suspend') {
      await suspendCorporateEmail(emailId, auth.tenantId);
      return NextResponse.json({ success: true });
    }

    if (action === 'activate') {
      await activateCorporateEmail(emailId, auth.tenantId);
      return NextResponse.json({ success: true });
    }

    if (body.signature !== undefined) {
      // Actualizar firma
      await updateEmailSignature(
        emailId,
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

      await resetEmailPassword(emailId, auth.tenantId, body.password);

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: emailId } = await params;
    await deleteCorporateEmail(emailId, auth.tenantId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting corporate email:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


