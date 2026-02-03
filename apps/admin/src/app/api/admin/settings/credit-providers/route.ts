import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

// Obtener credenciales de proveedores de crédito
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const credentialsDoc = await db.collection('system').doc('credit_providers').get();

    if (credentialsDoc.exists) {
      const data = credentialsDoc.data();
      // Enmascarar las API keys para seguridad
      const maskedCredentials: any = {};
      
      if (data?.experian) {
        maskedCredentials.experian = {
          ...data.experian,
          apiKey: data.experian.apiKey ? '••••••••••••••••' : '',
          apiSecret: data.experian.apiSecret ? '••••••••••••••••' : '',
        };
      }
      
      if (data?.equifax) {
        maskedCredentials.equifax = {
          ...data.equifax,
          apiKey: data.equifax.apiKey ? '••••••••••••••••' : '',
          apiSecret: data.equifax.apiSecret ? '••••••••••••••••' : '',
        };
      }
      
      if (data?.transunion) {
        maskedCredentials.transunion = {
          ...data.transunion,
          apiKey: data.transunion.apiKey ? '••••••••••••••••' : '',
          apiSecret: data.transunion.apiSecret ? '••••••••••••••••' : '',
        };
      }

      return NextResponse.json({ credentials: maskedCredentials });
    }

    return NextResponse.json({ credentials: {} });
  } catch (error: any) {
    console.error('Error fetching credit provider credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Guardar credenciales de proveedores de crédito
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { experian, equifax, transunion } = body;

    // Obtener credenciales existentes para preservar las que no se están actualizando
    const existingDoc = await db.collection('system').doc('credit_providers').get();
    const existingData = existingDoc.exists ? existingDoc.data() : {};

    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Actualizar Experian solo si se proporciona y no está enmascarado
    if (experian) {
      updateData.experian = {
        enabled: experian.enabled || false,
        apiKey: experian.apiKey && !experian.apiKey.includes('•') 
          ? experian.apiKey 
          : (existingData?.experian?.apiKey || ''),
        apiSecret: experian.apiSecret && !experian.apiSecret.includes('•')
          ? experian.apiSecret
          : (existingData?.experian?.apiSecret || ''),
      };
    }

    // Actualizar Equifax solo si se proporciona y no está enmascarado
    if (equifax) {
      updateData.equifax = {
        enabled: equifax.enabled || false,
        apiKey: equifax.apiKey && !equifax.apiKey.includes('•')
          ? equifax.apiKey
          : (existingData?.equifax?.apiKey || ''),
        apiSecret: equifax.apiSecret && !equifax.apiSecret.includes('•')
          ? equifax.apiSecret
          : (existingData?.equifax?.apiSecret || ''),
      };
    }

    // Actualizar TransUnion solo si se proporciona y no está enmascarado
    if (transunion) {
      updateData.transunion = {
        enabled: transunion.enabled || false,
        apiKey: transunion.apiKey && !transunion.apiKey.includes('•')
          ? transunion.apiKey
          : (existingData?.transunion?.apiKey || ''),
        apiSecret: transunion.apiSecret && !transunion.apiSecret.includes('•')
          ? transunion.apiSecret
          : (existingData?.transunion?.apiSecret || ''),
      };
    }

    await db.collection('system').doc('credit_providers').set({
      ...existingData,
      ...updateData,
      createdAt: existingData?.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true, message: 'Credenciales guardadas exitosamente' });
  } catch (error: any) {
    console.error('Error saving credit provider credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


