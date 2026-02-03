export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getContractById, updateContractDigitalization } from '@autodealers/crm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contract = await getContractById(auth.tenantId!, id);
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    await updateContractDigitalization(auth.tenantId!, id, {
      status: 'processing',
    });

    // TODO: Integrar con servicio de OCR real
    setTimeout(async () => {
      const digitalization = {
        status: 'completed' as const,
        extractedFields: {},
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

      await updateContractDigitalization(auth.tenantId!, id, digitalization);
    }, 2000);

    const updatedContract = await getContractById(auth.tenantId!, id);
    
    return NextResponse.json({ 
      contract: updatedContract,
      message: 'Digitalización iniciada. Se completará en breve.',
    });
  } catch (error: any) {
    console.error('Error digitalizing contract:', error);
    return NextResponse.json(
      { error: error.message || 'Error al digitalizar contrato' },
      { status: 500 }
    );
  }
}

