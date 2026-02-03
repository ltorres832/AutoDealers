import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { generateAIReport } from '@autodealers/ai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportType, filters } = body;

    if (!reportType) {
      return NextResponse.json({ error: 'reportType es requerido' }, { status: 400 });
    }

    const report = await generateAIReport(auth.tenantId, reportType, filters);

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error('Error generando reporte:', error);
    return NextResponse.json(
      { error: 'Error al generar reporte', details: error.message },
      { status: 500 }
    );
  }
}


