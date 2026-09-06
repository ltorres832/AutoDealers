'use client';

import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { ensureFirebaseClientAuth, isFirebaseClientReady } from '@/lib/ensure-firebase-client-auth';

/**
 * Suscribe a colecciones de ventas + staff_access_*.
 * Dispara onChange (debounced) para refresh silencioso vía API.
 */
export function useRealtimeSalesAdmin(onChange: () => void): { realtimeReady: boolean } {
  const [realtimeReady, setRealtimeReady] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    const unsubs: Unsubscribe[] = [];
    let debounce: number | undefined;

    function notify() {
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(() => onChangeRef.current(), 150);
    }

    async function start() {
      await ensureFirebaseClientAuth().catch(() => undefined);
      if (cancelled) return;
      if (!isFirebaseClientReady() || !db || typeof (db as { type?: string }).type !== 'string') {
        setRealtimeReady(false);
        return;
      }

      setRealtimeReady(true);
      const cols = [
        'sales_employees',
        'sales_employee_accounts',
        'sales_employee_commissions',
        'sales_employee_visits',
        'sales_employee_appointments',
        'staff_access_requests',
        'staff_access_grants',
      ];

      for (const name of cols) {
        unsubs.push(
          onSnapshot(
            collection(db, name),
            () => notify(),
            (err) => console.warn(`[admin sales realtime] ${name}`, err)
          )
        );
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (debounce) window.clearTimeout(debounce);
      unsubs.forEach((u) => {
        try {
          u();
        } catch {
          /* ignore */
        }
      });
    };
  }, []);

  return { realtimeReady };
}
