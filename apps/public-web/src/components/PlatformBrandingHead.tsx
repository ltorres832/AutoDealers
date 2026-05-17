'use client';

import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import {
  applyPlatformFaviconToDocument,
  parsePlatformBrandingFirestoreData,
  PLATFORM_BRANDING_COLLECTION,
  PLATFORM_BRANDING_DOC_ID,
  DEFAULT_PLATFORM_BRAND_ASSET,
} from '@autodealers/shared/platform-branding-client';

async function applyFromPublicApi() {
  try {
    const res = await fetch('/api/public/platform-branding', { cache: 'no-store' });
    if (!res.ok) {
      applyPlatformFaviconToDocument(DEFAULT_PLATFORM_BRAND_ASSET, 0);
      return;
    }
    const data = (await res.json()) as {
      favicon?: string;
      logoVersion?: number;
    };
    const fav =
      typeof data.favicon === 'string' && data.favicon.trim()
        ? data.favicon.trim()
        : DEFAULT_PLATFORM_BRAND_ASSET;
    const v = typeof data.logoVersion === 'number' ? data.logoVersion : 0;
    applyPlatformFaviconToDocument(fav, v);
  } catch {
    applyPlatformFaviconToDocument(DEFAULT_PLATFORM_BRAND_ASSET, 0);
  }
}

/**
 * Favicon / apple-touch-icon desde Firestore `admin_settings/branding` en tiempo real.
 * Si el cliente Firebase no está disponible, usa la API pública.
 */
export function PlatformBrandingHead() {
  useEffect(() => {
    let unsub: (() => void) | undefined;

    if (db) {
      try {
        const r = doc(db, PLATFORM_BRANDING_COLLECTION, PLATFORM_BRANDING_DOC_ID);
        unsub = onSnapshot(
          r,
          (snap) => {
            if (!snap.exists()) {
              void applyFromPublicApi();
              return;
            }
            const d = snap.data() as Record<string, unknown> | undefined;
            const p = parsePlatformBrandingFirestoreData(d, d?.updatedAt);
            applyPlatformFaviconToDocument(p.favicon, p.logoVersion);
            try {
              window.dispatchEvent(new CustomEvent('platform-branding-changed', { detail: p }));
            } catch {
              /* ignore */
            }
          },
          () => {
            void applyFromPublicApi();
          }
        );
      } catch {
        void applyFromPublicApi();
      }
    } else {
      void applyFromPublicApi();
    }

    return () => {
      unsub?.();
    };
  }, []);

  return null;
}
