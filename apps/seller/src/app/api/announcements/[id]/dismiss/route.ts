import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

function getDb() {
  const db = getFirestore();
  if (!db) {
    throw new Error('Firestore no está inicializado');
  }
  return db;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: announcementId } = await params;
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const db = getDb();
    
    // Obtener información del usuario para determinar tenantId
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();
    const tenantId = auth.tenantId || userData?.tenantId || userData?.dealerId;

    if (!tenantId) {
      return NextResponse.json({ error: 'TenantId not found' }, { status: 400 });
    }

    const announcementRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('announcements')
      .doc(announcementId);

    const doc = await announcementRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const data = doc.data();
    const dismissedBy = data?.dismissedBy || [];

    if (!dismissedBy.includes(auth.userId)) {
      await announcementRef.update({
        dismissedBy: admin.firestore.FieldValue.arrayUnion(auth.userId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error dismissing announcement:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
