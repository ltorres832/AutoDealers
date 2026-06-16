'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { MustChangePasswordModal } from '@autodealers/shared/client';
import { auth } from '@/lib/firebase-client';

export function MustChangePasswordGate({
  user,
  children,
}: {
  user?: { email?: string; mustChangePassword?: boolean } | null;
  children: React.ReactNode;
}) {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, () => setAuthReady(true));
    return () => unsub();
  }, []);

  if (user?.mustChangePassword) {
    if (!authReady || !auth?.currentUser) {
      return (
        <div className="flex justify-center items-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      );
    }

    return (
      <MustChangePasswordModal
        email={user.email || auth.currentUser.email || ''}
        auth={auth}
        onComplete={() => {
          window.location.reload();
        }}
      />
    );
  }

  return <>{children}</>;
}
