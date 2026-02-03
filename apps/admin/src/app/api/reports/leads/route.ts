export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { generateLeadsReport } from '@autodealers/reports';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    // Calcular fechas según período
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Si es admin, generar reporte global
    // Si no, generar reporte del tenant
    if (auth.role === 'admin') {
      // Para admin, generar reporte de todos los tenants
      const { getFirestore } = await import('@autodealers/core');
      const db = getFirestore();
      
      // Obtener todos los leads
      const leadsSnapshot = await db.collectionGroup('leads').get();
      
      let totalLeads = 0;
      const bySource: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const byMonth: Record<string, number> = {};
      
      leadsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const leadDate = data.createdAt?.toDate?.() || new Date(data.createdAt?.seconds * 1000 || Date.now());
        
        if (leadDate >= startDate && leadDate <= endDate) {
          totalLeads++;
          
          // Por fuente
          const source = data.source || 'unknown';
          bySource[source] = (bySource[source] || 0) + 1;
          
          // Por estado
          const status = data.status || 'new';
          byStatus[status] = (byStatus[status] || 0) + 1;
          
          // Por mes
          const monthKey = leadDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
          byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
        }
      });
      
      const report = {
        total: totalLeads,
        bySource,
        byStatus,
        byMonth,
        conversionRate: 0, // Se calcularía con ventas
      };
      
      return NextResponse.json({ report });
    } else {
      // Para dealer/seller, usar el tenantId
      if (!auth.tenantId) {
        return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
      }
      
      const report = await generateLeadsReport(auth.tenantId, {
        startDate,
        endDate,
      });

      return NextResponse.json({ report });
    }
  } catch (error: any) {
    console.error('Error generating leads report:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        report: {
          total: 0,
          bySource: {},
          byStatus: {},
          byMonth: {},
          conversionRate: 0,
        }
      },
      { status: 500 }
    );
  }
}
