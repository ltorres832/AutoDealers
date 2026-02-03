import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { validateDocument, getFIRequestById, DocumentType } from '@autodealers/crm';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || (auth.role !== 'dealer' && auth.role !== 'seller')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { documentUrl, documentType, requestId } = body;

    if (!documentUrl || !documentType || !requestId) {
      return NextResponse.json(
        { error: 'documentUrl, documentType y requestId son requeridos' },
        { status: 400 }
      );
    }

    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const fiRequest = await getFIRequestById(auth.tenantId, requestId);
    if (!fiRequest) {
      return NextResponse.json(
        { error: 'Solicitud F&I no encontrada' },
        { status: 404 }
      );
    }

    // Validar documento (placeholder - requiere implementación con IA/OCR)
    const validation = await validateDocument(
      documentUrl,
      documentType as DocumentType,
      fiRequest
    );

    return NextResponse.json({ validation });
  } catch (error: any) {
    console.error('Error validating document:', error);
    return NextResponse.json(
      { error: error.message || 'Error al validar documento' },
      { status: 500 }
    );
  }
}

