export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { requireTenantFeature } from '@/lib/membership-middleware';
import { validateDocument } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fiGate = await requireTenantFeature(auth.tenantId, 'useFIModule');
    if (fiGate) return fiGate;

    const body = await request.json();
    const { documentId, documentUrl, documentType, clientId } = body;

    if (!documentUrl || !documentType || !clientId) {
      return NextResponse.json(
        { error: 'documentUrl, documentType and clientId are required' },
        { status: 400 }
      );
    }

    const validation = await validateDocument(
      documentUrl,
      documentType,
      { id: clientId, tenantId: auth.tenantId } as any
    );

    const validationResult = {
      isValid: validation.isValid,
      isLegible: validation.isLegible,
      extractedData: validation.extractedData || {},
      matchesRequest: validation.matchesRequest,
      discrepancies: validation.discrepancies || [],
      confidence: validation.confidence,
      validationDate: validation.validationDate.toISOString(),
      notes: validation.confidence >= 0.8
        ? 'Validación completada.'
        : 'Revisión manual recomendada.',
    };

    const db = getFirestore();
    const documentsSnapshot = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('fi_clients')
      .doc(clientId)
      .collection('documents')
      .where('id', '==', documentId)
      .limit(1)
      .get();

    if (!documentsSnapshot.empty) {
      await documentsSnapshot.docs[0].ref.update({
        status: validationResult.isValid ? 'valid' : 'needs_review',
        validation: validationResult,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json(validationResult);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al validar documento';
    console.error('Error validating document:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
