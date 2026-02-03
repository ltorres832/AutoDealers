export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getContractTemplates } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const templates = await getContractTemplates(auth.tenantId!, type || undefined);

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error('Error fetching contract templates:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener plantillas' },
      { status: 500 }
    );
  }
}


