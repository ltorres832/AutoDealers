// API route para solicitar documentos en casos de cliente (Seller)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { canExecuteFeature, getFirestore, recordFeatureUsage } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gate = await canExecuteFeature(auth.tenantId, 'requestCustomerDocuments');
    if (!gate.allowed) {
      return NextResponse.json(
        { error: gate.reason || 'No permitido por membresía' },
        { status: 403 }
      );
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
      .doc(fileId);

    const fileDoc = await fileRef.get();
    if (!fileDoc.exists) {
      return NextResponse.json({ error: 'Caso de cliente no encontrado' }, { status: 404 });
    }

    const fileData = fileDoc.data();
    const requestedDocuments = fileData?.requestedDocuments || [];

    const requestedAt = new Date();
    const newRequest = {
      id: generateRandomId(),
      name,
      description: description || '',
      type: type || 'other',
      required: required !== false,
      requestedAt,
      requestedBy: auth.userId,
      status: 'pending',
    };

    requestedDocuments.push(newRequest);

    await fileRef.update({
      requestedDocuments,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);

    await recordFeatureUsage(auth.tenantId, 'requestCustomerDocuments', {
      customerFileId: fileId,
    });

    return NextResponse.json({
      document: {
        ...newRequest,
        requestedAt: new Date(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al solicitar documento';
    console.error('Error en POST /api/customer-files/[fileId]/request-document:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
