import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subdomain } = body;

    if (!subdomain || !/^[a-z0-9-]+$/.test(subdomain)) {
      return NextResponse.json({ error: 'Subdomain format invalid' }, { status: 400 });
    }

    // Verificar que el subdominio no esté en uso
    const existingSnapshot = await db
      .collection('tenants')
      .where('subdomain', '==', subdomain)
      .get();

    if (!existingSnapshot.empty) {
      const existing = existingSnapshot.docs[0];
      if (existing.id !== auth.tenantId) {
        return NextResponse.json({ error: 'Subdomain already in use' }, { status: 400 });
      }
    }

    // Actualizar tenant con el subdominio
    await db.collection('tenants').doc(auth.tenantId).update({
      subdomain,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, subdomain });
  } catch (error: any) {
    console.error('Error updating subdomain:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



