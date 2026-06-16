'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MembershipOnboardingBanner } from './MembershipOnboardingBanner';

function MembershipOnboardingNoticeInner({
  accountLabel,
  createdByAdmin,
}: {
  accountLabel?: 'cuenta' | 'concesionario';
  createdByAdmin?: boolean;
}) {
  const searchParams = useSearchParams();
  if (searchParams.get('onboarding') !== 'required') return null;
  return (
    <MembershipOnboardingBanner accountLabel={accountLabel} createdByAdmin={createdByAdmin} />
  );
}

export function MembershipOnboardingNotice({
  accountLabel = 'cuenta',
  createdByAdmin = false,
}: {
  accountLabel?: 'cuenta' | 'concesionario';
  createdByAdmin?: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <MembershipOnboardingNoticeInner
        accountLabel={accountLabel}
        createdByAdmin={createdByAdmin}
      />
    </Suspense>
  );
}
