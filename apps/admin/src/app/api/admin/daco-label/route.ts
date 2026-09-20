export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getPlatformDacoLabelSettings,
  savePlatformDacoLabelSettings,
} from '@autodealers/inventory';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const settings = await getPlatformDacoLabelSettings();
    return NextResponse.json(settings);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error al cargar' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const settings = await savePlatformDacoLabelSettings({
      warrantyNote: typeof body.warrantyNote === 'string' ? body.warrantyNote : undefined,
      footerNote: typeof body.footerNote === 'string' ? body.footerNote : undefined,
    });
    return NextResponse.json({ success: true, settings });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  }
}
