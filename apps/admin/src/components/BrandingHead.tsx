'use client';

import { useEffect, useCallback, useRef } from 'react';
import { getApps } from 'firebase/app';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import {
  applyPlatformFaviconToDocument,
  parsePlatformBrandingFirestoreData,
  PLATFORM_BRANDING_COLLECTION,
  PLATFORM_BRANDING_DOC_ID,
  DEFAULT_PLATFORM_BRAND_ASSET,
} from '@autodealers/shared/platform-branding-client';

/**
 * Aplica favicon (y apple-touch-icon) desde la API o, si hay Firebase cliente, en tiempo real desde Firestore.
 */
export function BrandingHead() {
  const cancelledRef = useRef(false);

  const applyFromApi = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings/branding', {
        credentials: 'include',
        cache: 'no-store',
      });
      let iconUrl = DEFAULT_PLATFORM_BRAND_ASSET;
      let v = Date.now();
      if (response.ok && !cancelledRef.current) {
        const data = await response.json();
        v = typeof data.logoVersion === 'number' ? data.logoVersion : Date.now();
        if (typeof data.favicon === 'string' && data.favicon.trim() !== '') {
          iconUrl = data.favicon.trim();
        }
      }
      if (cancelledRef.current) return;
      applyPlatformFaviconToDocument(iconUrl, v);
    } catch {
      if (cancelledRef.current) return;
      applyPlatformFaviconToDocument(DEFAULT_PLATFORM_BRAND_ASSET, 0);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    void applyFromApi();

    let unsub: (() => void) | undefined;
    if (typeof window !== 'undefined' && getApps().length > 0) {
      try {
        const ref = doc(db, PLATFORM_BRANDING_COLLECTION, PLATFORM_BRANDING_DOC_ID);
        unsub = onSnapshot(
          ref,
          (snap) => {
            if (cancelledRef.current) return;
            if (!snap.exists()) {
              void applyFromApi();
              return;
            }
            const d = snap.data() as Record<string, unknown> | undefined;
            const p = parsePlatformBrandingFirestoreData(d, d?.updatedAt);
            applyPlatformFaviconToDocument(p.favicon, p.logoVersion);
          },
          () => {
            if (!cancelledRef.current) void applyFromApi();
          }
        );
      } catch {
        /* la API ya aplicó favicon */
      }
    }

    return () => {
      cancelledRef.current = true;
      unsub?.();
    };
  }, [applyFromApi]);

  useEffect(() => {
    const onBrandingUpdated = () => void applyFromApi();
    window.addEventListener('autodealers-branding-updated', onBrandingUpdated);
    return () => window.removeEventListener('autodealers-branding-updated', onBrandingUpdated);
  }, [applyFromApi]);

  return null;
}
