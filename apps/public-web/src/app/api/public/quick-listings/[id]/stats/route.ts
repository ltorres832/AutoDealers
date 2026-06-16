export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getQuickListingOwnerStats } from '@autodealers/core';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const token = new URL(request.url).searchParams.get('token') || '';
    const stats = await getQuickListingOwnerStats(id, token);
    if (!stats) {
      return NextResponse.json({ error: 'No autorizado o anuncio no encontrado' }, { status: 404 });
    }
    return NextResponse.json({
      id: stats.id,
      views: stats.views,
      make: stats.make,
      model: stats.model,
      year: stats.year,
      expiresAt: stats.expiresAt ? stats.expiresAt.toISOString() : null,
    });
  } catch (e) {
    console.error('quick-listings stats GET:', e);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
