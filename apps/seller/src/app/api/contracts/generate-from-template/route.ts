export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { generateContractFromTemplate } from '@autodealers/crm';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, fieldValues, saleId, leadId, vehicleId } = body;

    if (!templateId || !fieldValues) {
      return NextResponse.json(
        { error: 'templateId and fieldValues are required' },
        { status: 400 }
      );
    }

    const result = await generateContractFromTemplate(
      auth.tenantId!,
      templateId,
      fieldValues,
      saleId,
      leadId,
      vehicleId
    );

    return NextResponse.json({ 
      success: true,
      contractId: result.contractId,
      documentUrl: result.documentUrl,
    });
  } catch (error: any) {
    console.error('Error generating contract from template:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar contrato desde plantilla' },
      { status: 500 }
    );
  }
}


