import { NextResponse } from 'next/server';
import {
  listAdPlacementOptions,
  mergeStoredBannerPlacements,
} from '@autodealers/core/ad-placements';
import { getPricingConfig } from '@autodealers/core';

export async function GET() {
  try {
    const config = await getPricingConfig();
    const banners = mergeStoredBannerPlacements(config.banners);
    return NextResponse.json({
      placements: listAdPlacementOptions().map((item) => ({
        ...item,
        prices: banners[item.id]?.prices || item.defaultPrices,
        durations: banners[item.id]?.durations || [7, 15, 30],
      })),
    });
  } catch (error) {
    console.error('Error listing banner placements:', error);
    return NextResponse.json({
      placements: listAdPlacementOptions().map((item) => ({
        ...item,
        prices: item.defaultPrices,
        durations: [7, 15, 30],
      })),
    });
  }
}
