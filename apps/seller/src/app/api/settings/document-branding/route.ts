export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDocumentBrandingConfig, setDocumentBrandingConfig } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.userId || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.tenantId;
    const userId = auth.userId;

    const config = await getDocumentBrandingConfig(tenantId, userId);
    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('Error fetching document branding config:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.userId || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.tenantId;
    const userId = auth.userId;

    const body = await request.json();
    const config = await setDocumentBrandingConfig({
      tenantId,
      userId,
      ...body,
    });

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('Error updating document branding config:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}


