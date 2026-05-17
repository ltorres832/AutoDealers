export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getCrmPipelineSettings,
  normalizeCrmPipelineSettings,
  saveCrmPipelineSettings,
} from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const config = await getCrmPipelineSettings();
    return NextResponse.json(config);
  } catch (e) {
    console.error('crm-pipeline GET:', e);
    return NextResponse.json({ error: 'Error al cargar' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const normalized = normalizeCrmPipelineSettings(body);
    await saveCrmPipelineSettings(normalized, { userId: auth.userId });
    const saved = await getCrmPipelineSettings();
    return NextResponse.json({ success: true, settings: saved });
  } catch (e) {
    console.error('crm-pipeline PUT:', e);
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  }
}
