export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { hashQuickListingVisitorId, listQuickListingsByVisitorId } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const visitorId = new URL(request.url).searchParams.get('visitorId') || '';
    if (!hashQuickListingVisitorId(visitorId)) {
      return NextResponse.json({ items: [] });
    }
    const items = await listQuickListingsByVisitorId(visitorId, { limit: 10 });
    return NextResponse.json({ items });
  } catch (e) {
    console.error('quick-listings mine GET:', e);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
