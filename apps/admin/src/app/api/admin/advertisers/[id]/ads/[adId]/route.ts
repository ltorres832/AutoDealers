import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
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
    if (!['approved', 'suspended', 'pending', 'payment_pending', 'active'].includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    await db.collection('sponsored_content').doc(adId).update({
      status,
      approvedAt: status === 'approved' || status === 'active' ? admin.firestore.FieldValue.serverTimestamp() : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin update ad status error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar anuncio' },
      { status: 500 }
    );
  }
}

