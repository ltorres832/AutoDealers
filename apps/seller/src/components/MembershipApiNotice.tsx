'use client';

import { useEffect, useState } from 'react';
import UpgradeModal from '@/components/UpgradeModal';

export function MembershipApiNotice() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(
    'Esta función no está incluida en tu plan. Selecciona o activa tu membresía.'
  );

  useEffect(() => {
    function onRequired(event: Event) {
      const detail = (event as CustomEvent<{ reason?: string }>).detail;
      setReason(
        detail?.reason ||
          'Esta función no está incluida en tu plan. Selecciona o activa tu membresía.'
      );
      setOpen(true);
    }
    window.addEventListener('seller-membership-required', onRequired);
    return () => window.removeEventListener('seller-membership-required', onRequired);
  }, []);

  return (
    <UpgradeModal
      isOpen={open}
      onClose={() => setOpen(false)}
      reason={reason}
      featureName="Función de membresía"
    />
  );
}
