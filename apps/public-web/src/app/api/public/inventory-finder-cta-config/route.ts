import { NextResponse } from 'next/server';
import { getInventoryFinderCtaConfig } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getInventoryFinderCtaConfig();
    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });
  } catch (e) {
    console.error('inventory-finder-cta-config', e);
    return NextResponse.json(
      {
        enabled: false,
        title: '',
        description: '',
        primarySmallLabel: '',
        primaryMainLabel: '',
        primaryHoverHint: '',
        primaryHref: '',
        secondaryLabel: '',
        secondaryHref: '',
        footerText: '',
        showFooterPulse: true,
      },
      { status: 200 }
    );
  }
}
