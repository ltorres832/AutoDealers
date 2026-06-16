export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getContractById, updateContractDigitalization } from '@autodealers/crm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: contractId } = await params;
    const contract = await getContractById(auth.tenantId, contractId);
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    await updateContractDigitalization(auth.tenantId, contractId, {
      status: 'processing',
    });

    const c = contract as Record<string, unknown>;
    const digitalization = {
      status: 'completed' as const,
      extractedFields: {
        vehicleMake: c.vehicleMake || '',
        vehicleModel: c.vehicleModel || '',
        vehicleYear: c.vehicleYear || null,
        price: c.salePrice || c.price || null,
      },
      signatureFields: [
        {
          id: 'buyer_signature',
          type: 'signature' as const,
          x: 0.1,
          y: 0.8,
          width: 0.3,
          height: 0.1,
          required: true,
          signer: 'buyer' as const,
          label: 'Firma del Comprador',
        },
        {
          id: 'seller_signature',
          type: 'signature' as const,
          x: 0.6,
          y: 0.8,
          width: 0.3,
          height: 0.1,
          required: true,
          signer: 'seller' as const,
          label: 'Firma del Vendedor',
        },
      ],
      completedAt: new Date(),
    };

    await updateContractDigitalization(auth.tenantId, contractId, digitalization);
    const updatedContract = await getContractById(auth.tenantId, contractId);

    return NextResponse.json({
      contract: updatedContract,
      message: 'Digitalización completada.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al digitalizar contrato';
    console.error('Error digitalizing contract:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
