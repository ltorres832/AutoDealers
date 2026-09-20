export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  listGeneratedDocuments,
  getGeneratedDocument,
  createShareLink,
  emailGeneratedDocument,
  whatsappGeneratedDocument,
  updateGeneratedDocumentStatus,
} from '@autodealers/core';

async function requireDealer(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth?.tenantId || !isDealerPortalRole(auth.role)) return null;
  return auth;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireDealer(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (id) {
      const document = await getGeneratedDocument(auth.tenantId!, id);
      if (!document) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      return NextResponse.json({ document });
    }
    const documents = await listGeneratedDocuments(auth.tenantId!);
    return NextResponse.json({
      documents: documents.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('generated GET', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireDealer(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const documentId = body.documentId as string;
    if (!documentId) {
      return NextResponse.json({ error: 'documentId requerido' }, { status: 400 });
    }

    if (body.action === 'share') {
      const { token, expiresAt } = await createShareLink(auth.tenantId!, documentId);
      const origin = request.nextUrl.origin.replace('dealer.', 'www.');
      // Prefer public-web host if configured
      const publicBase =
        process.env.NEXT_PUBLIC_PUBLIC_WEB_URL ||
        process.env.PUBLIC_WEB_URL ||
        'https://autodealers-online.com';
      return NextResponse.json({
        token,
        expiresAt,
        url: `${publicBase.replace(/\/$/, '')}/documents/view/${token}`,
      });
    }

    if (body.action === 'email') {
      if (!body.to) return NextResponse.json({ error: 'Email destino requerido' }, { status: 400 });
      await emailGeneratedDocument(auth.tenantId!, documentId, body.to, {
        subject: body.subject,
        message: body.message,
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === 'whatsapp') {
      if (!body.to) return NextResponse.json({ error: 'Teléfono destino requerido' }, { status: 400 });
      const publicBase =
        process.env.NEXT_PUBLIC_PUBLIC_WEB_URL ||
        process.env.PUBLIC_WEB_URL ||
        'https://autodealers-online.com';
      const result = await whatsappGeneratedDocument(auth.tenantId!, documentId, body.to, {
        message: body.message,
        publicBaseUrl: publicBase,
      });
      return NextResponse.json({ success: true, url: result.url });
    }

    if (body.action === 'void') {
      await updateGeneratedDocumentStatus(auth.tenantId!, documentId, 'void');
      return NextResponse.json({ success: true });
    }

    if (body.action === 'send_for_signature') {
      const doc = await getGeneratedDocument(auth.tenantId!, documentId);
      if (!doc?.pdfUrl) {
        return NextResponse.json({ error: 'Documento sin PDF' }, { status: 400 });
      }
      const { createContract, sendContractForSignature } = await import('@autodealers/crm');
      const signerEmail = body.signerEmail || doc.parties?.buyerEmail;
      const signerName = body.signerName || doc.parties?.buyerName || 'Firmante';
      if (!signerEmail) {
        return NextResponse.json({ error: 'Email del firmante requerido' }, { status: 400 });
      }
      const contract = await createContract(auth.tenantId!, {
        name: doc.name,
        type: 'purchase',
        originalDocumentUrl: doc.pdfUrl,
        vehicleId: doc.vehicleId,
        leadId: doc.leadId,
        saleId: doc.saleId,
        createdBy: auth.userId,
        digitalization: {
          status: 'completed',
          signatureFields: [
            {
              id: 'sig_buyer',
              type: 'signature',
              x: 0.1,
              y: 0.75,
              width: 0.35,
              height: 0.08,
              required: true,
              signer: 'buyer',
              label: 'Firma del comprador',
            },
          ],
        },
      } as any);

      await sendContractForSignature(
        auth.tenantId!,
        contract.id,
        'buyer',
        signerEmail,
        signerName,
        body.signerPhone
      );

      await updateGeneratedDocumentStatus(auth.tenantId!, documentId, 'awaiting_signature', {
        contractId: contract.id,
      });

      return NextResponse.json({ success: true, contractId: contract.id });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('generated POST', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
