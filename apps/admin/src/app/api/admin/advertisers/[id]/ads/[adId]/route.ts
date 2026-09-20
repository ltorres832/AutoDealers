import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, activationSchedulePatch } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { adId } = await params;
    const { status } = await request.json();
    if (!['approved', 'active', 'paused', 'suspended', 'pending', 'payment_pending', 'rejected', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    const ref = db.collection('sponsored_content').doc(adId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Anuncio no encontrado' }, { status: 404 });
    }
    const existing = snap.data() || {};

    const patch: Record<string, unknown> = {
      status: status === 'suspended' ? 'paused' : status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      moderatedBy: auth.userId,
      moderatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (status === 'approved' || status === 'active') {
      patch.approvedBy = auth.userId;
      patch.approvedAt = admin.firestore.FieldValue.serverTimestamp();
      Object.assign(patch, activationSchedulePatch(existing as Record<string, unknown>));
    }

    await ref.update(patch);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin update ad status error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar anuncio' },
      { status: 500 }
    );
  }
}

