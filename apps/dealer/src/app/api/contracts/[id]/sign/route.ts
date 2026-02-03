export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getContractById, addContractSignature } from '@autodealers/crm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { signatureData, signatureType, signerName, signerRole } = body;

    if (!signatureData) {
      return NextResponse.json({ error: 'Signature data is required' }, { status: 400 });
    }

    const { id: contractId } = await params;
    const contract = await getContractById(auth.tenantId!, contractId);
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Obtener información del usuario
    const userResponse = await fetch(`${request.nextUrl.origin}/api/user`, {
      headers: request.headers,
    });
    const userData = await userResponse.json();
    const user = userData.user;

    // Crear firma
    const signature = {
      id: `sig_${Date.now()}`,
      signer: (signerRole || auth.role || 'dealer') as any,
      signerName: signerName || user?.name || 'Usuario',
      signerEmail: user?.email,
      signerPhone: user?.phone,
      signatureType: signatureType || 'in_person',
      status: 'signed' as const,
      signatureData,
      signedAt: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    await addContractSignature(auth.tenantId!, contractId, signature);

    const updatedContract = await getContractById(auth.tenantId!, contractId);

    return NextResponse.json({ contract: updatedContract });
  } catch (error: any) {
    console.error('Error signing contract:', error);
    return NextResponse.json(
      { error: error.message || 'Error al firmar contrato' },
      { status: 500 }
    );
  }
}

