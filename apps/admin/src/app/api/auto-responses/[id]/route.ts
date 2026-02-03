import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('auto_responses')
      .doc(id)
      .update({
        ...body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      } as any);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating auto response:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}





