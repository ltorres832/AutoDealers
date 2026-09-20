'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MembershipOnboardingBanner } from './MembershipOnboardingBanner';

function MembershipOnboardingNoticeInner({
  accountLabel,
  createdByAdmin,
  hasActivePlan,
}: {
  accountLabel?: 'cuenta' | 'concesionario';
  createdByAdmin?: boolean;
  hasActivePlan?: boolean;
}) {
  const searchParams = useSearchParams();
  if (hasActivePlan) return null;
  if (searchParams.get('onboarding') !== 'required') return null;
  return (
    <MembershipOnboardingBanner accountLabel={accountLabel} createdByAdmin={createdByAdmin} />
  );
}

export function MembershipOnboardingNotice({
  accountLabel = 'cuenta',
  createdByAdmin = false,
  hasActivePlan = false,
}: {
  accountLabel?: 'cuenta' | 'concesionario';
  createdByAdmin?: boolean;
  hasActivePlan?: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <MembershipOnboardingNoticeInner
        accountLabel={accountLabel}
        createdByAdmin={createdByAdmin}
        hasActivePlan={hasActivePlan}
      />
    </Suspense>
  );
}
