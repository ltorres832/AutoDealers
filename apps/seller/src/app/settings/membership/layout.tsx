'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadCurrentSellerUser } from '@/lib/current-seller-user';

export default function SellerMembershipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    void loadCurrentSellerUser().then((user) => {
      if (user?.dealerId) {
        router.replace('/settings');
        setAllowed(false);
      } else {
        setAllowed(true);
      }
    });
  }, [router]);

  if (allowed !== true) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return <>{children}</>;
}
