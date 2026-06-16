'use client';

import { useEffect, useState } from 'react';
import { loadCurrentSellerUser } from '@/lib/current-seller-user';
import { DealerLinkSettingsPanel } from '@/components/DealerLinkSettingsPanel';

export default function SellerDealerLinkPage() {
  const [userId, setUserId] = useState<string>();
  const [dealerId, setDealerId] = useState<string>();

  useEffect(() => {
    void loadCurrentSellerUser().then((u) => {
      if (u) {
        setUserId(u.id);
        setDealerId(u.dealerId);
      }
    });
  }, []);

  return <DealerLinkSettingsPanel userId={userId} dealerId={dealerId} />;
}
