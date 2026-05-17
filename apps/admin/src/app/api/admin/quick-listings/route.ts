export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { listQuickListings, purgeExpiredQuickListings } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const includeAll = url.searchParams.get('includeAll') === '1';
    const items = await listQuickListings({ limit: 100, includeAll });

    return NextResponse.json({
      items: items.map((it) => ({
        id: it.id,
        contactName: it.contactName,
        contactPhone: it.contactPhone,
        contactEmail: it.contactEmail,
        city: it.city,
        make: it.make,
        model: it.model,
        year: it.year,
        price: it.price,
        currency: it.currency,
        photos: it.photos.slice(0, 1),
        status: it.status,
        views: it.views,
        createdAt: it.createdAt ? it.createdAt.toISOString() : null,
        expiresAt: it.expiresAt ? it.expiresAt.toISOString() : null,
      })),
    });
  } catch (e) {
    console.error('admin quick-listings GET:', e);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const removed = await purgeExpiredQuickListings();
    return NextResponse.json({ ok: true, removed });
  } catch (e) {
    console.error('admin quick-listings purge:', e);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
