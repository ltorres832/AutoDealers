'use client';

import { useMemo } from 'react';
import { usePublicPlacementCreatives } from '@/hooks/usePublicPlacementCreatives';
import type { PublicPlacementCreative } from '@/lib/public-placement-creatives';

function hasBannerMedia(item: PublicPlacementCreative) {
  return Boolean(item.imageUrl || item.images?.length || item.videoUrl || item.videos?.length);
}

/** Paid `vehicle_page` creatives (advertiser app + admin). Excludes tenant promo cards. */
export function useVehiclePageCreatives(limit: number = 8) {
  const { content, loading } = usePublicPlacementCreatives('vehicle_page', limit);

  const banners = useMemo(
    () =>
      content.filter((item) => item.kind !== 'promo' && hasBannerMedia(item)).slice(0, limit),
    [content, limit]
  );

  return {
    content: banners,
    loading,
  } satisfies { content: PublicPlacementCreative[]; loading: boolean };
}
