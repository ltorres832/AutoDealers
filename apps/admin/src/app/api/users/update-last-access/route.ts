import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

/**
 * Actualiza el último acceso del usuario actual
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Actualizar lastLogin en Firestore
    const userRef = db.collection('users').doc(auth.userId);
    await userRef.update({
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      lastAccess: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Si el usuario tiene tenantId, también actualizar en la colección de tenants/users
    if (auth.tenantId) {
      const tenantUserRef = db
        .collection('tenants')
        .doc(auth.tenantId)
        .collection('users')
        .doc(auth.userId);
      
      const tenantUserDoc = await tenantUserRef.get();
      if (tenantUserDoc.exists) {
        await tenantUserRef.update({
          lastLogin: admin.firestore.FieldValue.serverTimestamp(),
          lastAccess: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Last access updated',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error updating last access:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
