'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
/**
 * Incrementa en cada cambio del plan (documento memberships o tenant vinculado).
 * Usar como dependencia para re-evaluar menús y permisos.
 */
export function useMembershipPlanRevision(): number {
  const [revision, setRevision] = useState(0);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [billingTenantId, setBillingTenantId] = useState<string | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    if (!auth) return undefined;
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseReady(!!user);
    });
    return unsub;
  }, []);
  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      try {
        const res = await fetch('/api/membership/plan-context', { credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json()) as {
          membershipId?: string | null;
          billingTenantId?: string | null;
        };
        if (cancelled) return;
        setMembershipId(
          typeof data.membershipId === 'string' && data.membershipId.trim()
            ? data.membershipId.trim()
            : null
        );
        setBillingTenantId(
          typeof data.billingTenantId === 'string' && data.billingTenantId.trim()
            ? data.billingTenantId.trim()
            : null
        );
      } catch {
        /* non-critical */
      }
    }

    void loadContext();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!db || !firebaseReady || !membershipId) return undefined;

    const unsub = onSnapshot(
      doc(db, 'memberships', membershipId),
      () => setRevision((r) => r + 1),
      () => undefined
    );
    return unsub;
  }, [membershipId, firebaseReady]);

  useEffect(() => {
    if (!db || !firebaseReady || !billingTenantId) return undefined;

    const unsub = onSnapshot(
      doc(db, 'tenants', billingTenantId),
      () => setRevision((r) => r + 1),
      () => undefined
    );
    return unsub;
  }, [billingTenantId, firebaseReady]);

  return revision;
}
