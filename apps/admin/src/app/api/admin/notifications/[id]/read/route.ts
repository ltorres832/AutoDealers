export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

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
    const db = getFirestore();
    
    // Buscar en tenant si está disponible
    const tenantId = auth.tenantId;
    if (tenantId) {
      await db.collection('tenants').doc(tenantId).collection('notifications').doc(id).update({ 
        read: true,
        readAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Fallback para admin
      await db.collection('notifications').doc(id).update({ 
        read: true,
        readAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


