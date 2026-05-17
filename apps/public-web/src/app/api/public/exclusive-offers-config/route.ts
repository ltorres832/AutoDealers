import { NextResponse } from 'next/server';
import { getExclusiveOffersSectionConfig } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getExclusiveOffersSectionConfig();
    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });
  } catch (e) {
    console.error('exclusive-offers-config', e);
    return NextResponse.json(
      {
        enabled: false,
        badgeLabel: '',
        title: '',
        subtitle: '',
        cards: [],
      },
      { status: 200 }
    );
  }
}
