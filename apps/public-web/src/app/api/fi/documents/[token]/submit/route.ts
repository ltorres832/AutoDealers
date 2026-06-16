import { NextRequest, NextResponse } from 'next/server';
import { getDocumentRequestByToken, submitDocumentToRequest } from '@autodealers/crm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { type, name, url } = body;

    if (!type || !name || !url) {
      return NextResponse.json(
        { error: 'Tipo, nombre y URL del documento son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que la solicitud existe
    const docRequest = await getDocumentRequestByToken(token);
    if (!docRequest) {
      return NextResponse.json(
        { error: 'Solicitud de documentos no encontrada o expirada' },
        { status: 404 }
      );
    }

    // Notificaciones push/email/SMS/in-app vía submitDocumentToRequest en CRM
    await submitDocumentToRequest(token, { type, name, url });

    const updatedRequest = await getDocumentRequestByToken(token);

    return NextResponse.json({
      success: true,
      documentRequest: updatedRequest,
      message: 'Documento subido correctamente',
    });
  } catch (error: any) {
    console.error('Error en POST /api/fi/documents/[token]/submit:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir documento' },
      { status: 500 }
    );
  }
}

