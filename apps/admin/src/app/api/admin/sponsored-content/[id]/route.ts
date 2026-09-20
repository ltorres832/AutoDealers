import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, activationSchedulePatch } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

const ALLOWED_STATUSES = [
  'pending',
  'approved',
  'active',
  'paused',
  'suspended',
  'rejected',
  'cancelled',
  'payment_pending',
  'expired',
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status?: string };

    if (!status || !ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    const ref = db.collection('sponsored_content').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Anuncio no encontrado' }, { status: 404 });
    }

    const existing = snap.data() || {};

    const patch: Record<string, unknown> = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      moderatedBy: auth.userId,
      moderatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (status === 'approved' || status === 'active') {
      patch.approvedBy = auth.userId;
      patch.approvedAt = admin.firestore.FieldValue.serverTimestamp();
      Object.assign(patch, activationSchedulePatch(existing as Record<string, unknown>));
    }

    if (status === 'rejected') {
      patch.rejectionReason = body.reason || 'Rechazado por administrador';
    }

    await ref.update(patch);

    return NextResponse.json({ success: true, status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(_request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ref = db.collection('sponsored_content').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Anuncio no encontrado' }, { status: 404 });
    }

    await ref.delete();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
