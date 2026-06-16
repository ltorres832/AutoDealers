import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { requireTenantFeature } from '@/lib/membership-middleware';
import {
  generateAndStoreFIDocument,
  generateFIDocumentPdf,
  fiTemplateFilename,
  type FIDocumentTemplate,
  TEMPLATE_TITLES,
} from '@autodealers/core';
import { getFIRequestById, getFIClientById } from '@autodealers/crm';

const VALID_TEMPLATES: FIDocumentTemplate[] = [
  'credit_application',
  'pre_approval_letter',
  'rejection_letter',
  'financing_summary',
  'lender_package',
  'terms_agreement',
  'cosigner_agreement',
];

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const fiGate = await requireTenantFeature(auth.tenantId, 'useFIModule');
    if (fiGate) return fiGate;

    const body = await request.json();
    const { requestId, template, downloadOnly } = body;

    if (!requestId || !template) {
      return NextResponse.json(
        { error: 'requestId y template son requeridos' },
        { status: 400 }
      );
    }

    if (!VALID_TEMPLATES.includes(template)) {
      return NextResponse.json({ error: 'Plantilla no válida' }, { status: 400 });
    }

    const fiRequest = await getFIRequestById(auth.tenantId, requestId);
    if (!fiRequest) {
      return NextResponse.json({ error: 'Solicitud F&I no encontrada' }, { status: 404 });
    }

    const client = await getFIClientById(auth.tenantId, fiRequest.clientId);
    if (!client) {
      return NextResponse.json({ error: 'Cliente F&I no encontrado' }, { status: 404 });
    }

    if (downloadOnly) {
      const pdfBuffer = await generateFIDocumentPdf({
        tenantId: auth.tenantId,
        userId: auth.userId,
        template,
        client,
        request: fiRequest,
      });
      const filename = fiTemplateFilename(template, client.name);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const stored = await generateAndStoreFIDocument({
      tenantId: auth.tenantId,
      userId: auth.userId,
      requestId,
      template,
      client,
      request: fiRequest,
    });

    return NextResponse.json({
      success: true,
      document: stored,
      title: TEMPLATE_TITLES[template],
      message: 'Documento PDF generado correctamente.',
    });
  } catch (error: unknown) {
    console.error('Error generating document:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error al generar documento',
      },
      { status: 500 }
    );
  }
}
