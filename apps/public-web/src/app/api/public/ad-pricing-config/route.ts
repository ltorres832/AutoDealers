import { NextRequest, NextResponse } from 'next/server';
import {
  AD_PLACEMENT_DIMENSIONS,
  AD_PLACEMENT_IDS,
  formatAdPlacementPixelSize,
} from '@autodealers/core/ad-placement-dimensions';
import {
  AD_PLACEMENT_LABELS,
  DEFAULT_BANNER_PLACEMENT_PRICES,
  mergeStoredBannerPlacements,
} from '@autodealers/core/ad-placements';
import { getFirestore } from '@autodealers/shared';

const db = getFirestore();

function toPlacementPayload(
  banners: Record<string, { prices?: Record<string, number> }>
) {
  return AD_PLACEMENT_IDS.map((id) => {
    const prices = banners[id]?.prices ?? DEFAULT_BANNER_PLACEMENT_PRICES[id];
    const numericPrices = Object.fromEntries(
      Object.entries(prices).map(([days, price]) => [days, Number(price)])
    );
    const minPrice = Math.min(...Object.values(numericPrices));
    const spec = AD_PLACEMENT_DIMENSIONS[id];
    return {
      id,
      label: AD_PLACEMENT_LABELS[id],
      description: undefined as string | undefined,
      prices: numericPrices,
      fromPrice: Number.isFinite(minPrice) ? minPrice : null,
      imageWidth: spec.width,
      imageHeight: spec.height,
      imageSize: formatAdPlacementPixelSize(spec),
      aspectRatio: spec.aspectRatio,
      maxUploadMb: spec.maxUploadMb,
    };
  });
}

export async function GET(_request: NextRequest) {
  try {
    const configDoc = await db.collection('admin_config').doc('pricing').get();
    const config = configDoc.exists ? configDoc.data() : null;
    const banners = mergeStoredBannerPlacements(config?.banners);
    const currency = config?.currency ?? 'USD';
    const taxRate = config?.taxRate ?? 0;

    return NextResponse.json({
      currency,
      taxRate,
      placements: toPlacementPayload(banners),
    });
  } catch (error: unknown) {
    console.error('Error fetching ad pricing config:', error);
    return NextResponse.json({
      currency: 'USD',
      taxRate: 0,
      placements: toPlacementPayload(DEFAULT_BANNER_PLACEMENT_PRICES as any),
    });
  }
}
