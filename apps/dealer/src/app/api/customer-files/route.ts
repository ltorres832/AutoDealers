export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { getCustomerFileById, getCustomerFiles } from '@autodealers/crm';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const saleId = searchParams.get('saleId');
    const status = searchParams.get('status');

    // Si hay filtros específicos, buscar por esos filtros
    if (customerId) {
      const customerFiles = await getCustomerFiles(auth.tenantId!, { customerId });
      if (customerFiles.length > 0) {
        return NextResponse.json({ customerFile: customerFiles[0] });
      }
      return NextResponse.json({ error: 'Customer file not found' }, { status: 404 });
    }

    if (saleId) {
      const customerFiles = await getCustomerFiles(auth.tenantId!, { saleId });
      if (customerFiles.length > 0) {
        return NextResponse.json({ customerFile: customerFiles[0] });
      }
      return NextResponse.json({ error: 'Customer file not found' }, { status: 404 });
    }

    // Si no hay filtros específicos, listar todos los casos del tenant
    const filters: any = {};
    if (status && status !== 'all') {
      filters.status = status;
    }

    const customerFiles = await getCustomerFiles(auth.tenantId!, filters);
    
    // Eliminar duplicados por ID (por si hay casos duplicados)
    const uniqueFiles = Array.from(
      new Map(customerFiles.map(file => [file.id, file])).values()
    );
    
    return NextResponse.json({ files: uniqueFiles });
  } catch (error: any) {
    console.error('Error fetching customer files:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener archivos del cliente' },
      { status: 500 }
    );
  }
}
