export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { getCustomerFiles, getCustomerFileById } from '@autodealers/crm';

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
    const fileId = searchParams.get('id');
    const status = searchParams.get('status');

    if (fileId) {
      // Obtener por ID
      const customerFile = await getCustomerFileById(auth.tenantId!, fileId);
      if (customerFile) {
        return NextResponse.json({ customerFile });
      }
      return NextResponse.json({ error: 'Customer file not found' }, { status: 404 });
    }

    if (customerId) {
      // Buscar por customerId
      const customerFiles = await getCustomerFiles(auth.tenantId!, { customerId });
      if (customerFiles.length > 0) {
        return NextResponse.json({ customerFile: customerFiles[0] });
      }
      // Si no existe, retornar null en lugar de 404 para que el componente pueda crear uno
      return NextResponse.json({ customerFile: null });
    }

    if (saleId) {
      // Buscar por saleId
      const customerFiles = await getCustomerFiles(auth.tenantId!, { saleId });
      if (customerFiles.length > 0) {
        return NextResponse.json({ customerFile: customerFiles[0] });
      }
      return NextResponse.json({ customerFile: null });
    }

    // Si no hay filtros específicos, listar todos los casos del vendedor
    const filters: any = {};
    if (status && status !== 'all') {
      filters.status = status;
    }
    
    // Filtrar por vendedor (sellerId) para que solo vea sus propios casos
    // IMPORTANTE: Usar el userId del auth que es el sellerId
    if (auth.userId) {
      filters.sellerId = auth.userId;
    }

    const customerFiles = await getCustomerFiles(auth.tenantId!, filters);
    
    // Eliminar duplicados por ID (por si acaso)
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
