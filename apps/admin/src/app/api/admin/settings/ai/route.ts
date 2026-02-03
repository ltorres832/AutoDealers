import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

// Obtener configuración de IA
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configDoc = await db.collection('system').doc('ai_config').get();

    if (configDoc.exists) {
      const data = configDoc.data();
      return NextResponse.json({
        config: {
          provider: data?.provider || 'none',
          openaiApiKey: data?.openaiApiKey ? '••••••••••••••••' : '',
          anthropicApiKey: data?.anthropicApiKey ? '••••••••••••••••' : '',
          model: data?.model || 'gpt-4',
          maxTokens: data?.maxTokens || 1000,
          temperature: data?.temperature || 0.7,
        },
      });
    }

    return NextResponse.json({ config: null });
  } catch (error: any) {
    console.error('Error fetching AI config:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Guardar configuración de IA
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, openaiApiKey, anthropicApiKey, model, maxTokens, temperature } = body;

    if (!provider || provider === 'none') {
      return NextResponse.json({ error: 'Proveedor de IA es requerido' }, { status: 400 });
    }

    const updateData: any = {
      provider,
      model: model || 'gpt-4',
      maxTokens: maxTokens || 1000,
      temperature: temperature || 0.7,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Solo actualizar las keys si se proporcionan y no están enmascaradas
    if (openaiApiKey && !openaiApiKey.includes('•')) {
      updateData.openaiApiKey = openaiApiKey;
    }
    if (anthropicApiKey && !anthropicApiKey.includes('•')) {
      updateData.anthropicApiKey = anthropicApiKey;
    }

    await db.collection('system').doc('ai_config').set({
      ...updateData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true, message: 'Configuración de IA guardada exitosamente' });
  } catch (error: any) {
    console.error('Error saving AI config:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

