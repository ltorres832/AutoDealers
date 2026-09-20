import { listActiveFeaturedPromotions, type FeaturedPromotion } from '@autodealers/core';

export type PublicFeaturedFlags = {
  isFeatured?: boolean;
  isBoosted?: boolean;
  featuredBadge?: string;
  featuredPromotionId?: string;
  featuredExpiresAt?: string;
};

export async function getActiveFeaturedByTarget(targetType?: 'vehicle' | 'seller' | 'dealer') {
  const active = await listActiveFeaturedPromotions({
    targetType,
    limit: 100,
  });
  const byTarget = new Map<string, FeaturedPromotion>();
  for (const promo of active) {
    const key = `${promo.targetType}:${promo.targetId}`;
    const current = byTarget.get(key);
    if (!current || promo.kind === 'boost_24h' || current.kind !== 'boost_24h') {
      byTarget.set(key, promo);
    }
  }
  return byTarget;
}

export function flagsForFeaturedPromotion(promo?: FeaturedPromotion): PublicFeaturedFlags {
  if (!promo) return {};
  return {
    isFeatured: true,
    isBoosted: promo.kind === 'boost_24h',
    featuredBadge: promo.kind === 'boost_24h' ? 'Boost 24h' : 'Destacado',
    featuredPromotionId: promo.id,
    featuredExpiresAt: promo.expiresAt.toISOString(),
  };
}

export function sortFeaturedFirst<T extends { isFeatured?: boolean; isBoosted?: boolean; createdAt?: unknown }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    if (a.isBoosted !== b.isBoosted) return a.isBoosted ? -1 : 1;
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    const da = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
    return db - da;
  });
}
