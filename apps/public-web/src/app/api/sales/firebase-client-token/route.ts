export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@autodealers/core';
import { verifySalesEmployeeAuth } from '@/lib/sales-employee-auth';

/**
 * Custom token para Firebase Client SDK (onSnapshot en el portal de ventas).
 * La sesión HMAC sigue siendo la fuente de verdad para APIs; esto solo habilita listeners.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await verifySalesEmployeeAuth(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customToken = await getAuth().createCustomToken(authUser.userId, {
      role: 'sales_employee',
      salesEmployeeId: authUser.salesEmployeeId,
      authApp: 'sales',
    });

    return NextResponse.json({ customToken });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al generar token';
    console.error('[sales] firebase-client-token:', error);
    return NextResponse.json({ customToken: null, fallback: true, error: message });
  }
}
