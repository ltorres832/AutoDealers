import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, activationSchedulePatch } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ref = db.collection('sponsored_content').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Anuncio no encontrado' }, { status: 404 });
    }

    await ref.update({
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...activationSchedulePatch((snap.data() || {}) as Record<string, unknown>),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error activating sponsored content:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

