export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkQuickListingEligibility } from '@autodealers/core';
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
    const url = new URL(request.url);
    const visitorId = url.searchParams.get('visitorId') || '';
    const contactPhone = url.searchParams.get('contactPhone') || '';
    const contactEmail = url.searchParams.get('contactEmail') || '';
    const ip = getClientIp(request);

    const result = await checkQuickListingEligibility({
      visitorId,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      ipHash: hashIp(ip),
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    console.error('quick-listings eligibility:', e);
    return NextResponse.json(
      {
        allowed: false,
        reason: 'No se pudo verificar elegibilidad.',
        registerPath: '/register?type=seller',
      },
      { status: 500 }
    );
  }
}
