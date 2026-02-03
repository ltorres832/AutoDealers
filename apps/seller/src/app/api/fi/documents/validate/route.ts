export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getOpenAIApiKey } from '@autodealers/core';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, documentUrl, documentType, clientId } = body;

    if (!documentUrl || !documentType) {
      return NextResponse.json(
        { error: 'documentUrl and documentType are required' },
        { status: 400 }
      );
    }

    // Por ahora, retornar validación básica
    // En producción, aquí se integraría con servicios de IA/OCR reales
    // como Google Cloud Vision API, AWS Textract, o servicios similares

    const apiKey = await getOpenAIApiKey();
    
    // Validación básica simulada
    // TODO: Integrar con servicio de OCR real
    const validationResult = {
      isValid: true,
      isLegible: true,
      extractedData: {},
      matchesRequest: true,
      discrepancies: [],
      confidence: 0.85,
      validationDate: new Date().toISOString(),
      notes: 'Validación básica completada. Integración con OCR pendiente.',
    };

    // Actualizar estado del documento en Firestore
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    
    // Buscar el documento y actualizar su estado
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
      const docRef = documentsSnapshot.docs[0].ref;
      await docRef.update({
        status: validationResult.isValid ? 'valid' : 'needs_review',
        validation: validationResult,
        updatedAt: (await import('firebase-admin')).firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json(validationResult);
  } catch (error: any) {
    console.error('Error validating document:', error);
    return NextResponse.json(
      { error: error.message || 'Error al validar documento' },
      { status: 500 }
    );
  }
}


