import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
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

    // Actualizar estado del anunciante
    await db.collection('advertisers').doc(id).update({
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Actualizar custom claims del usuario
    const advertiserDoc = await db.collection('advertisers').doc(id).get();
    const advertiserData = advertiserDoc.data();
    
    if (advertiserData?.email) {
      const userRecord = await admin.auth().getUserByEmail(advertiserData.email);
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: 'advertiser',
        advertiserId: id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error approving advertiser:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

