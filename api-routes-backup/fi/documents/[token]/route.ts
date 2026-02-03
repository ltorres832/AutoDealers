// API route para obtener una solicitud de documentos por token (público)

import { NextRequest, NextResponse } from 'next/server';

// Para static export, necesitamos generar los params estáticamente
export async function generateStaticParams() {
  return [];
}
import { getDocumentRequestByToken } from '@autodealers/crm';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido' },
        { status: 400 }
      );
    }

    const documentRequest = await getDocumentRequestByToken(token);

    if (!documentRequest) {
      return NextResponse.json(
        { error: 'Solicitud de documentos no encontrada o expirada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ documentRequest });
  } catch (error: any) {
    console.error('Error en GET /api/fi/documents/[token]:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener solicitud de documentos' },
      { status: 500 }
    );
  }
}

