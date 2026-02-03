export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getActiveAnnouncements } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dashboard = searchParams.get('dashboard') as 'admin' | 'dealer' | 'seller' | 'public' | null;
    const userId = searchParams.get('userId') || undefined;
    const tenantId = searchParams.get('tenantId') || undefined;

    if (!dashboard) {
      return NextResponse.json(
        { error: 'Dashboard es requerido' },
        { status: 400 }
      );
    }

    const announcements = await getActiveAnnouncements(dashboard, userId, tenantId);
    return NextResponse.json({ announcements });
  } catch (error: any) {
    console.error('Error fetching active announcements:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener anuncios activos' },
      { status: 500 }
    );
  }
}


