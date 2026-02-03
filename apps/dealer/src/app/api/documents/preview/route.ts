export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOrderedBrandingElements } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('type') || 'certificate';

    // Obtener tenantId y userId
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

    const brandingElements = await getOrderedBrandingElements(
      tenantId,
      documentType,
      userId
    );

    return NextResponse.json({
      preview: {
        logos: brandingElements.logos,
        names: brandingElements.names,
        documentType,
      },
    });
  } catch (error: any) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar vista previa' },
      { status: 500 }
    );
  }
}


