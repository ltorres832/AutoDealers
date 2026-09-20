'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRealtimeSponsoredContent } from '@/hooks/useRealtimeSponsoredContent';
import {
  mergePublicCreatives,
  type PublicPlacementCreative,
  type PublicPlacementId,
} from '@/lib/public-placement-creatives';

export function usePublicPlacementCreatives(placement: PublicPlacementId, limit: number = 8) {
  const sponsoredPlacement = placement === 'promotions_section' ? 'hero' : placement;
  const { content: sponsoredRaw, loading: sponsoredLoading } = useRealtimeSponsoredContent(
    sponsoredPlacement,
    limit
  );
  const sponsored = placement === 'promotions_section' ? [] : sponsoredRaw;
  const [banners, setBanners] = useState<unknown[]>([]);
  const [promos, setPromos] = useState<unknown[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bannerQs = new URLSearchParams({
          status: 'active',
          limit: String(Math.max(limit * 3, 12)),
        });
        if (placement !== 'promotions_section') bannerQs.set('placement', placement);

        const promoQs = new URLSearchParams({ limit: String(Math.max(limit * 3, 12)) });
        promoQs.set('placement', placement);

        const [bannerRes, promoRes] = await Promise.all([
          placement === 'promotions_section'
            ? Promise.resolve(null)
            : fetch(`/api/public/banners?${bannerQs.toString()}`, { cache: 'no-store' }),
          fetch(`/api/public/promotions?${promoQs.toString()}`, { cache: 'no-store' }),
        ]);

        if (cancelled) return;
        const bannerJson = bannerRes && bannerRes.ok ? await bannerRes.json() : { banners: [] };
        const promoJson = promoRes.ok ? await promoRes.json() : { promotions: [] };
        setBanners(Array.isArray(bannerJson.banners) ? bannerJson.banners : []);
        setPromos(Array.isArray(promoJson.promotions) ? promoJson.promotions : []);
      } catch {
        if (!cancelled) {
          setBanners([]);
          setPromos([]);
        }
      } finally {
        if (!cancelled) setExtrasLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [placement, limit]);

  const content = useMemo(
    () =>
      mergePublicCreatives(
        [
          { items: sponsored, kind: 'sponsored' },
          { items: banners, kind: 'banner' },
          { items: promos, kind: 'promo' },
        ],
        limit
      ),
    [sponsored, banners, promos, limit]
  );

  return {
    content,
    loading: sponsoredLoading && extrasLoading,
  } satisfies { content: PublicPlacementCreative[]; loading: boolean };
}
