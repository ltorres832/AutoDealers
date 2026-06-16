import { NextResponse } from 'next/server';
import { isDealerManagedSeller } from '@/lib/billing-tenant';
import type { AuthUser } from './auth';

const MESSAGE =
  'Tu plan lo gestiona tu concesionario. No puedes modificar la membresía desde tu cuenta.';

export function dealerManagedBillingResponse(
  auth: Pick<AuthUser, 'dealerId'> | null | undefined
): NextResponse | null {
  if (!isDealerManagedSeller(auth?.dealerId)) return null;
  return NextResponse.json({ error: 'dealer_managed', message: MESSAGE }, { status: 403 });
}
