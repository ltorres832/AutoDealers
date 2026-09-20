export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { listQuickListings, purgeExpiredQuickListings } from '@autodealers/core';

function csvValue(value: unknown): string {
  if (value == null) return '';
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toIso(value: Date | null): string {
  return value ? value.toISOString() : '';
}

function buildQuickListingsCsv(items: Awaited<ReturnType<typeof listQuickListings>>): string {
  const headers = [
    'ID',
    'Estado',
    'Nombre',
    'Telefono',
    'Email',
    'Ciudad',
    'Vehiculo',
    'Ano',
    'Marca',
    'Modelo',
    'Millaje',
    'Precio',
    'Moneda',
    'Vistas',
    'Creado',
    'Vence',
  ];
  const rows = items.map((it) => [
    it.id,
    it.status,
    it.contactName,
    it.contactPhone,
    it.contactEmail || '',
    it.city || '',
    `${it.year} ${it.make} ${it.model}`,
    it.year,
    it.make,
    it.model,
    it.mileage ?? '',
    it.price,
    it.currency,
    it.views,
    toIso(it.createdAt),
    toIso(it.expiresAt),
  ]);

  return [headers, ...rows].map((row) => row.map(csvValue).join(',')).join('\r\n');
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const includeAll = url.searchParams.get('includeAll') === '1';
    const format = url.searchParams.get('format');
    const limit = format === 'csv' ? 1000 : 100;
    const items = await listQuickListings({ limit, includeAll });

    if (format === 'csv') {
      const csv = buildQuickListingsCsv(items);
      const today = new Date().toISOString().slice(0, 10);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="anuncios-particulares-${today}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

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
