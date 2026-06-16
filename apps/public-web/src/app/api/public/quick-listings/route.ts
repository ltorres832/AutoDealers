export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  createQuickListing,
  listQuickListings,
  purgeExpiredQuickListings,
} from '@autodealers/core';
import * as crypto from 'node:crypto';

function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') || null;
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

export async function GET(request: NextRequest) {
  try {
    purgeExpiredQuickListings().catch((e) => console.warn('[quick-listings] purge', e));

    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 24, 1), 100);
    const city = url.searchParams.get('city') || null;

    const items = await listQuickListings({ limit, city });

    return NextResponse.json(
      {
        items: items.map((it) => ({
          id: it.id,
          contactName: it.contactName,
          contactPhone: it.contactPhone,
          city: it.city,
          make: it.make,
          model: it.model,
          year: it.year,
          mileage: it.mileage,
          price: it.price,
          currency: it.currency,
          condition: it.condition,
          transmission: it.transmission,
          fuelType: it.fuelType,
          color: it.color,
          bodyType: it.bodyType,
          description: it.description,
          photos: it.photos,
          createdAt: it.createdAt ? it.createdAt.toISOString() : null,
          expiresAt: it.expiresAt ? it.expiresAt.toISOString() : null,
        })),
        total: items.length,
      },
      {
        headers: {
          // Lista cambia con anuncios nuevos; evita que el CDN oculte publicaciones recientes mucho tiempo.
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
        },
      }
    );
  } catch (e: unknown) {
    console.error('quick-listings GET:', e);
    return NextResponse.json({ items: [], total: 0 }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const ip = getClientIp(request);

    const result = await createQuickListing({
      contactName: body.contactName,
      contactPhone: body.contactPhone,
      contactEmail: body.contactEmail,
      city: body.city || null,
      make: body.make,
      model: body.model,
      year: Number(body.year),
      mileage: body.mileage != null ? Number(body.mileage) : null,
      price: Number(body.price),
      currency: body.currency || 'USD',
      condition: body.condition || 'used',
      transmission: body.transmission || null,
      fuelType: body.fuelType || null,
      color: body.color || null,
      bodyType: body.bodyType || null,
      description: body.description || null,
      photos: Array.isArray(body.photos) ? body.photos : [],
      acceptTerms: body.acceptTerms === true,
      ipHash: hashIp(ip),
      userAgent: request.headers.get('user-agent') || null,
      visitorId: typeof body.visitorId === 'string' ? body.visitorId : null,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.message || 'No se pudo publicar el anuncio.' },
        { status: result.status }
      );
    }

    return NextResponse.json({
      ok: true,
      id: result.id,
      durationDays: result.durationDays,
      expiresAt: result.expiresAt ? result.expiresAt.toISOString() : null,
      managementToken: result.managementToken || null,
    });
  } catch (e: unknown) {
    console.error('quick-listings POST:', e);
    return NextResponse.json(
      { ok: false, error: 'Error al publicar el anuncio.' },
      { status: 500 }
    );
  }
}
