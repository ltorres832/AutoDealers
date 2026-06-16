import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSelfServiceActiveMemberships, isDealerManagedSeller } from '@autodealers/billing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      const response = NextResponse.json(
        {
          error: 'Unauthorized',
          clearCookie: true,
          message: 'Por favor, inicia sesión como vendedor',
        },
        { status: 401 }
      );
      response.cookies.delete('authToken');
      return response;
    }

    if (isDealerManagedSeller(auth.dealerId)) {
      return NextResponse.json({
        memberships: [],
        plans: [],
        dealerManaged: true,
        message: 'Tu acceso lo gestiona tu concesionario.',
      });
    }

    const memberships = await getSelfServiceActiveMemberships('seller');
    return NextResponse.json({
      memberships,
      plans: memberships,
      dealerManaged: false,
      emptyReason:
        memberships.length === 0
          ? 'No hay planes de vendedor activos. Actívalos en Admin → Membresías.'
          : undefined,
    });
  } catch (error: unknown) {
    console.error('❌ [SELLER] Error fetching available memberships:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message, memberships: [], plans: [] }, { status: 500 });
  }
}
