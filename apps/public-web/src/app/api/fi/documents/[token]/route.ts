import { NextRequest, NextResponse } from 'next/server';
import { getDocumentRequestByToken } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    const documentRequest = await getDocumentRequestByToken(token);
    if (!documentRequest) {
      return NextResponse.json(
        { error: 'Solicitud de documentos no encontrada o expirada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ documentRequest });
  } catch (error: unknown) {
    console.error('Error en GET /api/fi/documents/[token]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener solicitud de documentos' },
      { status: 500 }
    );
  }
}
