'use client';

import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase-client';
import {
  applyPlatformFaviconToDocument,
  parsePlatformBrandingFirestoreData,
  PLATFORM_BRANDING_COLLECTION,
  PLATFORM_BRANDING_DOC_ID,
  DEFAULT_PLATFORM_BRAND_ASSET,
} from '@autodealers/shared/platform-branding-client';

export function PlatformBrandingHead() {
  useEffect(() => {
    const cli = getFirebaseClient();
    if (!cli?.db) {
      applyPlatformFaviconToDocument(DEFAULT_PLATFORM_BRAND_ASSET, 0);
      return;
    }
    let unsub: (() => void) | undefined;
    try {
      const r = doc(cli.db, PLATFORM_BRANDING_COLLECTION, PLATFORM_BRANDING_DOC_ID);
      unsub = onSnapshot(
        r,
        (snap) => {
          if (!snap.exists()) {
            applyPlatformFaviconToDocument(DEFAULT_PLATFORM_BRAND_ASSET, 0);
            return;
          }
          const d = snap.data() as Record<string, unknown> | undefined;
          const p = parsePlatformBrandingFirestoreData(d, d?.updatedAt);
          applyPlatformFaviconToDocument(p.favicon, p.logoVersion);
        },
        () => {
          applyPlatformFaviconToDocument(DEFAULT_PLATFORM_BRAND_ASSET, 0);
        }
      );
    } catch {
      applyPlatformFaviconToDocument(DEFAULT_PLATFORM_BRAND_ASSET, 0);
    }
    return () => unsub?.();
  }, []);

  return null;
}
