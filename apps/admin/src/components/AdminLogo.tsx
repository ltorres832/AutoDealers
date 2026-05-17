'use client';

import { useState, useEffect, useCallback } from 'react';
import { getApps } from 'firebase/app';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import {
  parsePlatformBrandingFirestoreData,
  PLATFORM_BRANDING_COLLECTION,
  PLATFORM_BRANDING_DOC_ID,
  DEFAULT_PLATFORM_BRAND_ASSET,
} from '@autodealers/shared/platform-branding-client';

interface AdminLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AdminLogo({ size = 'sm', className = '' }: AdminLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoVersion, setLogoVersion] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLogo = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings/branding', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        const url =
          typeof data.logo === 'string' && data.logo.trim() ? data.logo.trim() : DEFAULT_PLATFORM_BRAND_ASSET;
        setLogoUrl(url);
        setLogoVersion(typeof data.logoVersion === 'number' ? data.logoVersion : Date.now());
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    if (typeof window !== 'undefined' && getApps().length > 0) {
      try {
        const ref = doc(db, PLATFORM_BRANDING_COLLECTION, PLATFORM_BRANDING_DOC_ID);
        unsub = onSnapshot(
          ref,
          (snap) => {
            if (!snap.exists()) {
              setLogoUrl(DEFAULT_PLATFORM_BRAND_ASSET);
              setLogoVersion(0);
              setLoading(false);
              return;
            }
            const d = snap.data() as Record<string, unknown> | undefined;
            const p = parsePlatformBrandingFirestoreData(d, d?.updatedAt);
            setLogoUrl(p.logo);
            setLogoVersion(p.logoVersion > 0 ? p.logoVersion : Date.now());
            setLoading(false);
          },
          () => {
            void fetchLogo();
          }
        );
      } catch {
        void fetchLogo();
      }
    } else {
      void fetchLogo();
    }

    return () => {
      unsub?.();
    };
  }, [fetchLogo]);

  useEffect(() => {
    const onFocus = () => fetchLogo();
    const onBrandingUpdated = () => fetchLogo();
    window.addEventListener('focus', onFocus);
    window.addEventListener('autodealers-branding-updated', onBrandingUpdated);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('autodealers-branding-updated', onBrandingUpdated);
    };
  }, [fetchLogo]);

  const sizeClasses = {
    sm: 'h-10 w-auto',
    md: 'h-12 w-auto',
    lg: 'h-16 w-auto',
  };

  if (loading) {
    return (
      <div
        className={`${sizeClasses[size]} ${className} flex animate-pulse items-center justify-center rounded-lg bg-gray-100`}
      >
        <div className="h-6 w-6 rounded bg-gray-300"></div>
      </div>
    );
  }

  if (logoUrl) {
    const src =
      logoVersion > 0
        ? `${logoUrl}${logoUrl.includes('?') ? '&' : '?'}v=${logoVersion}`
        : logoUrl;
    return (
      <div className={`${sizeClasses[size]} ${className} relative`}>
        <img
          key={src}
          src={src}
          alt="Logo"
          className="h-full w-auto object-contain"
          onError={() => {
            setLogoUrl(null);
            setLogoVersion(0);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      <img
        src={DEFAULT_PLATFORM_BRAND_ASSET}
        alt="AutoDealers"
        className="h-full w-auto object-contain"
      />
    </div>
  );
}
