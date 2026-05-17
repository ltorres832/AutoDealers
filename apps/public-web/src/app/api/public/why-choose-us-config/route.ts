import { NextResponse } from 'next/server';
import { getWhyChooseUsSectionConfig } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getWhyChooseUsSectionConfig();
    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });
  } catch (e) {
    console.error('why-choose-us-config', e);
    return NextResponse.json(
      {
        enabled: false,
        badgeLabel: '',
        titleStart: '',
        titleHighlight: '',
        titleEnd: '',
        subtitle: '',
        cards: [],
      },
      { status: 200 }
    );
  }
}
