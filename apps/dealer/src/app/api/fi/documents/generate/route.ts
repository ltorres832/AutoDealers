import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

// Implementación directa para evitar problemas de webpack
async function getFIRequestByIdDirect(tenantId: string, requestId: string) {
  const requestDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId)
    .get();

  if (!requestDoc.exists) {
    return null;
  }

  const data = requestDoc.data();
  return {
    id: requestDoc.id,
    ...data,
    history: (data?.history || []).map((h: any) => ({
      ...h,
      timestamp: h.timestamp?.toDate() || new Date(),
    })),
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
    submittedAt: data?.submittedAt?.toDate() || undefined,
    reviewedAt: data?.reviewedAt?.toDate() || undefined,
  };
}

async function getFIClientByIdDirect(tenantId: string, clientId: string) {
  const clientDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_clients')
    .doc(clientId)
    .get();

  if (!clientDoc.exists) {
    return null;
  }

  const data = clientDoc.data();
  return {
    id: clientDoc.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
  };
}

type DocumentTemplate = 
  | 'credit_application'
  | 'pre_approval_letter'
  | 'rejection_letter'
  | 'financing_contract'
  | 'terms_agreement'
  | 'cosigner_agreement';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, template, customData } = body;

    if (!requestId || !template) {
      return NextResponse.json(
        { error: 'requestId y template son requeridos' },
        { status: 400 }
      );
    }

    const fiRequest = await getFIRequestByIdDirect(auth.tenantId!, requestId);
    if (!fiRequest) {
      return NextResponse.json(
        { error: 'Solicitud F&I no encontrada' },
        { status: 404 }
      );
    }

    const fiRequestAny = fiRequest as any;
    const client = await getFIClientByIdDirect(auth.tenantId!, fiRequestAny.clientId);
    if (!client) {
      return NextResponse.json(
        { error: 'Cliente F&I no encontrado' },
        { status: 404 }
      );
    }

    // TODO: Implementar generación real de PDF usando una librería como pdfkit o puppeteer
    // Por ahora retornamos un placeholder
    const clientAny = client as any;
    const documentData = {
      template: template as DocumentTemplate,
      requestId,
      clientName: clientAny.name,
      clientEmail: clientAny.email,
      clientPhone: clientAny.phone,
      vehiclePrice: clientAny.vehiclePrice,
      downPayment: clientAny.downPayment,
      monthlyIncome: fiRequestAny.employment?.monthlyIncome,
      creditRange: fiRequestAny.creditInfo?.creditRange,
      status: fiRequestAny.status,
      ...customData,
    };

    // En producción, aquí se generaría el PDF real
    const pdfUrl = `/api/fi/documents/generated/${requestId}/${template}.pdf`; // Placeholder

    return NextResponse.json({
      documentId: `${requestId}-${template}-${Date.now()}`,
      pdfUrl,
      documentData,
      message: 'Documento generado exitosamente (placeholder - requiere implementación de generación de PDF)',
    });
  } catch (error: any) {
    console.error('Error generating document:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar documento' },
      { status: 500 }
    );
  }
}

