// API route para solicitar documentos en casos de cliente (Seller)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { name, type, description, required } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'El nombre del documento es requerido' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const fileRef = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('customer_files')
      .doc(id);

    const fileDoc = await fileRef.get();
    if (!fileDoc.exists) {
      return NextResponse.json({ error: 'Caso de cliente no encontrado' }, { status: 404 });
    }

    const fileData = fileDoc.data();
    const requestedDocuments = fileData?.requestedDocuments || [];

    // Crear el objeto del documento con fecha actual (no serverTimestamp dentro del array)
    const requestedAt = new Date();
    const newRequest = {
      id: generateRandomId(),
      name,
      description: description || '',
      type: type || 'other',
      required: required !== false,
      requestedAt: requestedAt, // Usar Date en lugar de serverTimestamp()
      requestedBy: auth.userId,
      status: 'pending',
    };

    requestedDocuments.push(newRequest);

    await fileRef.update({
      requestedDocuments,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);

    return NextResponse.json({
      document: {
        ...newRequest,
        requestedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error('Error en POST /api/customer-files/[id]/request-document:', error);
    return NextResponse.json(
      { error: error.message || 'Error al solicitar documento' },
      { status: 500 }
    );
  }
}

