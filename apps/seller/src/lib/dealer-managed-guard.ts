import { NextResponse } from 'next/server';
import { isDealerManagedSeller } from '@/lib/billing-tenant';
import type { AuthUser } from './auth';

const MEMBERSHIP_MESSAGE =
  'Tu plan lo gestiona tu concesionario. No puedes modificar la membresía desde tu cuenta.';

export const DEALER_MANAGED_PAYMENTS_MESSAGE =
  'Los pagos y costos los gestiona tu concesionario. Contacta a tu dealer si necesitas promociones o destacados.';

export function dealerManagedBillingResponse(
  auth: Pick<AuthUser, 'dealerId' | 'billingMode'> | null | undefined,
  message = MEMBERSHIP_MESSAGE
): NextResponse | null {
  if (!isDealerManagedSeller(auth?.dealerId, auth?.billingMode)) return null;
  return NextResponse.json({ error: 'dealer_managed', message }, { status: 403 });
}

export function dealerManagedPaymentsResponse(
  auth: Pick<AuthUser, 'dealerId' | 'billingMode'> | null | undefined
): NextResponse | null {
  return dealerManagedBillingResponse(auth, DEALER_MANAGED_PAYMENTS_MESSAGE);
}
