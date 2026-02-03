import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

// Obtener credenciales globales de Meta
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Las credenciales globales se guardan en una colección especial
    const credentialsDoc = await db.collection('system').doc('meta_credentials').get();

    if (credentialsDoc.exists) {
      const data = credentialsDoc.data();
      return NextResponse.json({
        credentials: {
          appId: data?.appId || '',
          appSecret: data?.appSecret ? '••••••••••••••••' : '', // Enmascarar el secret
        },
      });
    }

    return NextResponse.json({ credentials: null });
  } catch (error: any) {
    console.error('Error fetching Meta credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Guardar credenciales globales de Meta
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appId, appSecret } = body;

    if (!appId) {
      return NextResponse.json({ error: 'App ID es requerido' }, { status: 400 });
    }

    // Si appSecret no se proporciona, mantener el existente
    const updateData: any = {
      appId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (appSecret && !appSecret.includes('•')) {
      updateData.appSecret = appSecret;
    }

    await db.collection('system').doc('meta_credentials').set({
      ...updateData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true, message: 'Credenciales guardadas exitosamente' });
  } catch (error: any) {
    console.error('Error saving Meta credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

