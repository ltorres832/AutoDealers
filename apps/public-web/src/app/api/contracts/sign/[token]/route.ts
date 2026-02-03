export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getContractBySignatureToken, completeContractSignature } from '@autodealers/crm';

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

    // Marcar como visto si aún no está firmado
    if (result.signature.status === 'sent') {
      // Actualizar estado a visto (esto se puede hacer en una función separada)
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

    // Obtener IP y User Agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Completar firma
    await completeContractSignature(
      result.contract.tenantId,
      result.contract.id,
      result.signature.id,
      signatureData,
      ipAddress,
      userAgent
    );

    // TODO: Enviar email de confirmación al cliente y al dealer/vendedor
    // TODO: Generar PDF final con todas las firmas

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error completing signature:', error);
    return NextResponse.json(
      { error: error.message || 'Error al completar firma' },
      { status: 500 }
    );
  }
}

