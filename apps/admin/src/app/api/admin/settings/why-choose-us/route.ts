export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getFirestore,
  getWhyChooseUsSectionConfig,
  normalizeWhyChooseUsSectionConfig,
} from '@autodealers/core';
import * as admin from 'firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(await getWhyChooseUsSectionConfig());
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
    const body = await request.json();
    const normalized = normalizeWhyChooseUsSectionConfig(body as Record<string, unknown>);

    await getFirestore()
      .collection('system_settings')
      .doc('why_choose_us_section')
      .set(
        {
          ...normalized,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: auth.userId,
        },
        { merge: true }
      );

    return NextResponse.json({ success: true, config: normalized });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  }
}
