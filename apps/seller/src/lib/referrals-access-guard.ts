import { NextResponse } from 'next/server';
import { isDealerManagedSeller } from '@/lib/billing-tenant';
import type { AuthUser } from './auth';

export const REFERRALS_DEALER_MANAGED_MESSAGE =
  'Los referidos y recompensas aplican solo a vendedores con membresía propia. Tu acceso lo gestiona tu concesionario.';

export function dealerManagedReferralsResponse(
  auth: Pick<AuthUser, 'dealerId'> | null | undefined
): NextResponse | null {
  if (!isDealerManagedSeller(auth?.dealerId)) return null;
  return NextResponse.json(
    { error: 'dealer_managed_referrals', message: REFERRALS_DEALER_MANAGED_MESSAGE },
    { status: 403 }
  );
}
