export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getContractBySignatureToken, completeContractSignature } from '@autodealers/crm';
import { getUserById, getTenantById, sendOutboundEmail } from '@autodealers/core';

async function notifyContractSigned(params: {
  tenantId: string;
  contractName: string;
  signerName: string;
  signerEmail?: string;
  createdBy: string;
  allSigned: boolean;
}) {
  const { tenantId, contractName, signerName, signerEmail, createdBy, allSigned } = params;
  const statusLine = allSigned
    ? 'Todas las firmas requeridas han sido completadas.'
    : 'Aún faltan firmas pendientes en el contrato.';

  const html = `
    <p>Hola,</p>
    <p><strong>${signerName}</strong> ha firmado el contrato <strong>${contractName}</strong>.</p>
    <p>${statusLine}</p>
    <p>Equipo AutoDealers</p>
  `;

  const tasks: Promise<unknown>[] = [];

  if (signerEmail?.trim()) {
    tasks.push(
      sendOutboundEmail(
        signerEmail.trim(),
        `Confirmación de firma — ${contractName}`,
        `<p>Hola ${signerName},</p><p>Tu firma del contrato <strong>${contractName}</strong> fue registrada correctamente.</p><p>${statusLine}</p><p>Gracias.</p>`,
        tenantId
      )
    );
  }

  const creator = await getUserById(createdBy);
  if (creator?.email?.trim()) {
    tasks.push(
      sendOutboundEmail(
        creator.email.trim(),
        `Contrato firmado — ${contractName}`,
        html,
        tenantId
      )
    );
  } else {
    const tenant = await getTenantById(tenantId);
    const contactEmail = tenant?.contactEmail?.trim();
    if (contactEmail) {
      tasks.push(
        sendOutboundEmail(
          contactEmail,
          `Contrato firmado — ${contractName}`,
          html,
          tenantId
        )
      );
    }
  }

  await Promise.allSettled(tasks);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const result = await getContractBySignatureToken(token);

    if (!result) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      contract: result.contract,
      signature: result.signature,
    });
  } catch (error: any) {
    console.error('Error fetching contract by token:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener contrato' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { signatureData, signerName } = body;

    if (!signatureData) {
      return NextResponse.json(
        { error: 'Signature data is required' },
        { status: 400 }
      );
    }

    const result = await getContractBySignatureToken(token);

    if (!result) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 404 }
      );
    }

    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    await completeContractSignature(
      result.contract.tenantId,
      result.contract.id,
      result.signature.id,
      signatureData,
      ipAddress,
      userAgent
    );

    const allSigned =
      result.contract.signatures?.every((s) =>
        s.id === result.signature.id ? true : s.status === 'signed'
      ) ?? false;

    try {
      await notifyContractSigned({
        tenantId: result.contract.tenantId,
        contractName: result.contract.name,
        signerName: signerName || result.signature.signerName || 'Cliente',
        signerEmail: result.signature.signerEmail,
        createdBy: result.contract.createdBy,
        allSigned,
      });
    } catch (emailError) {
      console.warn('Contract sign confirmation emails failed:', emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error completing signature:', error);
    return NextResponse.json(
      { error: error.message || 'Error al completar firma' },
      { status: 500 }
    );
  }
}
