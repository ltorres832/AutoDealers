export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDocumentBrandingConfig, setDocumentBrandingConfig } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResponse = await fetch(`${request.nextUrl.origin}/api/user`, {
      headers: {
        Cookie: `authToken=${token}`,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await userResponse.json();
    const tenantId = userData.user?.tenantId;
    const userId = userData.user?.id;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID no encontrado' }, { status: 400 });
    }

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
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResponse = await fetch(`${request.nextUrl.origin}/api/user`, {
      headers: {
        Cookie: `authToken=${token}`,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await userResponse.json();
    const tenantId = userData.user?.tenantId;
    const userId = userData.user?.id;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID no encontrado' }, { status: 400 });
    }

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


