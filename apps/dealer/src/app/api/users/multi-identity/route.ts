export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createMultiIdentityUser } from '@autodealers/core';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, passwordSeller, passwordAdmin, name, sellerData, adminData } = body;

    if (!email || !passwordSeller || !passwordAdmin || !name) {
      return NextResponse.json(
        { error: 'Email, passwords y name son requeridos' },
        { status: 400 }
      );
    }

    if (!sellerData || !sellerData.tenantId) {
      return NextResponse.json(
        { error: 'sellerData con tenantId es requerido' },
        { status: 400 }
      );
    }

    if (!adminData || !adminData.tenantIds || adminData.tenantIds.length === 0) {
      return NextResponse.json(
        { error: 'adminData con tenantIds es requerido' },
        { status: 400 }
      );
    }

    const result = await createMultiIdentityUser(
      email,
      passwordSeller,
      passwordAdmin,
      name,
      sellerData,
      {
        ...adminData,
        dealerId: auth.tenantId,
      },
      auth.userId || ''
    );

    return NextResponse.json({ 
      success: true, 
      sellerUserId: result.sellerUserId,
      adminUserId: result.adminUserId,
      message: 'Usuario con identidades múltiples creado exitosamente'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating multi-identity user:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}





