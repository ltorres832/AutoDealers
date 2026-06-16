import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { resolveIndependentSellerWorkspace } from '@/lib/seller-workspace';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      // Limpiar cookie inválida en la respuesta
      const response = NextResponse.json(
        { error: 'Unauthorized', clearCookie: true },
        { status: 401 }
      );
      response.cookies.delete('authToken');
      response.cookies.set('authToken', '', { 
        path: '/', 
        expires: new Date(0),
        maxAge: 0
      });
      return response;
    }

    const isIndependentWorkspace = await resolveIndependentSellerWorkspace({
      tenantId: auth.tenantId,
      userId: auth.userId,
      dealerId: auth.dealerId,
    });

    return NextResponse.json({
      user: {
        userId: auth.userId,
        tenantId: auth.tenantId,
        email: auth.email,
        role: auth.role,
        dealerId: auth.dealerId,
        isIndependentWorkspace,
      },
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
