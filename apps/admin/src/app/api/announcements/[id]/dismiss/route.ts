export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { dismissAnnouncement } from '@autodealers/core';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dismissAnnouncement(id, auth.userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error dismissing announcement:', error);
    return NextResponse.json(
      { error: error.message || 'Error al descartar anuncio' },
      { status: 500 }
    );
  }
}

