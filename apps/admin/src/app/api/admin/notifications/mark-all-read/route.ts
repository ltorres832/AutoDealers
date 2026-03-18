export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    const tenantId = auth.tenantId;
    
    const notificationsCollection = tenantId
      ? db.collection('tenants').doc(tenantId).collection('notifications')
      : db.collection('notifications');
    
    const notificationsSnapshot = await notificationsCollection
      .where('userId', '==', auth.userId)
      .where('read', '==', false)
      .get();

    const promises = notificationsSnapshot.docs.map((doc) =>
      doc.ref.update({ 
        read: true,
        readAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    );

    await Promise.all(promises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking all as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


