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
    const contract = await getContractById(auth.tenantId!, contractId);
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Actualizar estado a procesando
    await updateContractDigitalization(auth.tenantId!, contractId, {
      status: 'processing',
    });

    // TODO: Integrar con servicio de OCR real (Google Cloud Vision, AWS Textract, etc.)
    // Por ahora, simular digitalización
    setTimeout(async () => {
      // Simular extracción de campos y ubicación de campos de firma
      const digitalization = {
        status: 'completed' as const,
        extractedFields: {
          // Campos extraídos del contrato
          vehicleMake: 'Toyota',
          vehicleModel: 'Camry',
          vehicleYear: 2024,
          price: 30000,
          // etc.
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

      await updateContractDigitalization(auth.tenantId!, contractId, digitalization);
    }, 2000);

    // Por ahora, retornar inmediatamente con estado de procesamiento
    const updatedContract = await getContractById(auth.tenantId!, contractId);
    
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

