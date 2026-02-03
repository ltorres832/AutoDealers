export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createCustomerFile } from '@autodealers/crm';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, saleId, vehicleId, customerInfo } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      );
    }

    const customerFile = await createCustomerFile(
      auth.tenantId!,
      saleId || '',
      customerId,
      customerInfo || {
        fullName: 'Cliente',
        phone: '',
        email: '',
      },
      vehicleId || '',
      auth.userId || '',
      undefined // sellerInfo
    );

    return NextResponse.json({ customerFile });
  } catch (error: any) {
    console.error('Error creating customer file:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear archivo del cliente' },
      { status: 500 }
    );
  }
}
