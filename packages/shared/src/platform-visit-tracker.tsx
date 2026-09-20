'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export type PlatformVisitApp = 'public-web' | 'advertiser' | 'dealer' | 'seller' | 'admin' | 'business';

const VISITOR_STORAGE_KEY = 'autodealers_platform_visitor_id';
const LEGACY_PUBLIC_VISITOR_KEY = 'autodealers_public_visitor_id';

function getVisitorId(): string {
  try {
    const existing =
      window.localStorage.getItem(VISITOR_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_PUBLIC_VISITOR_KEY);
    if (existing) {
      window.localStorage.setItem(VISITOR_STORAGE_KEY, existing);
      return existing;
    }
    const generated =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function PlatformVisitTracker({
  app,
  endpoint = '/api/analytics/visit',
}: {
  app: PlatformVisitApp;
  endpoint?: string;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const payload = JSON.stringify({
      app,
      visitorId: getVisitorId(),
      path: pathname,
      referrer: document.referrer || undefined,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(endpoint, blob)) return;
    }

    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, [app, endpoint, pathname]);

  return null;
}

export default PlatformVisitTracker;
