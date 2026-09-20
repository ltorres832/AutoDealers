import { NextRequest, NextResponse } from 'next/server';
import {
  getAutomotiveBusinessById,
  getBusinessDocumentLink,
  getBusinessEstimateById,
  getBusinessInvoiceById,
} from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const link = await getBusinessDocumentLink(token);
    if (!link) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }
    const [business, document] = await Promise.all([
      getAutomotiveBusinessById(link.tenantId),
      link.type === 'invoice'
        ? getBusinessInvoiceById(link.tenantId, link.documentId)
        : getBusinessEstimateById(link.tenantId, link.documentId),
    ]);
    if (!document) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }
    return NextResponse.json({
      type: link.type,
      business: business ? { name: business.name, logoUrl: business.logoUrl } : null,
      document,
      isCharge: false,
    });
  } catch (error: any) {
    console.error('Error loading business document:', error);
    return NextResponse.json({ error: 'No se pudo cargar el documento' }, { status: 500 });
  }
}
