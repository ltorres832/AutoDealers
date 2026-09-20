export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getGeneratedDocumentByShareToken } from '@autodealers/core';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const token = params.token;
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    const document = await getGeneratedDocumentByShareToken(token);
    if (!document) {
      return NextResponse.json({ error: 'Documento no encontrado o enlace expirado' }, { status: 404 });
    }

    return NextResponse.json({
      document: {
        id: document.id,
        name: document.name,
        documentNumber: document.documentNumber,
        type: document.type,
        status: document.status,
        pdfUrl: document.pdfUrl,
        createdAt:
          document.createdAt instanceof Date
            ? document.createdAt.toISOString()
            : document.createdAt,
      },
    });
  } catch (error) {
    console.error('public documents GET', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
