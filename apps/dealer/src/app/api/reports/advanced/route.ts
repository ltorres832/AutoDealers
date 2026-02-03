import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getLeads } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    const db = getFirestore();
    const tenantId = auth.tenantId;
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Obtener todos los leads del período
    const leadsSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('leads')
      .where('createdAt', '>=', startDate)
      .get();

    const leads = leadsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));

    // Calcular métricas
    const totalLeads = leads.length;
    const closedLeads = leads.filter((l: any) => l.status === 'closed').length;
    const conversionRate = totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0;

    // Conversión por fuente
    const conversionBySource: Record<string, { leads: number; converted: number }> = {};
    leads.forEach((lead: any) => {
      if (!conversionBySource[lead.source]) {
        conversionBySource[lead.source] = { leads: 0, converted: 0 };
      }
      conversionBySource[lead.source].leads++;
      if (lead.status === 'closed') {
        conversionBySource[lead.source].converted++;
      }
    });

    const conversionBySourceArray = Object.entries(conversionBySource).map(([source, data]) => ({
      source,
      ...data,
    }));

    // Distribución por estado
    const statusCount: Record<string, number> = {};
    leads.forEach((lead: any) => {
      statusCount[lead.status] = (statusCount[lead.status] || 0) + 1;
    });

    const statusDistribution = Object.entries(statusCount).map(([status, value]) => ({
      name: status,
      value,
    }));

    // Distribución de scores
    const scoreRanges = [
      { range: '0-20', min: 0, max: 20 },
      { range: '21-40', min: 21, max: 40 },
      { range: '41-60', min: 41, max: 60 },
      { range: '61-80', min: 61, max: 80 },
      { range: '81-100', min: 81, max: 100 },
    ];

    const scoreDistribution = scoreRanges.map((range) => {
      const count = leads.filter((lead: any) => {
        const score = lead.score?.combined || lead.score?.automatic || 0;
        return score >= range.min && score <= range.max;
      }).length;
      return { range: range.range, count };
    });

    // Tiempo promedio en cada etapa (simplificado)
    const timeInStage = [
      { stage: 'Nuevo', days: 1 },
      { stage: 'Contactado', days: 2 },
      { stage: 'Calificado', days: 3 },
      { stage: 'Cita', days: 5 },
      { stage: 'Negociación', days: 7 },
    ];

    // Pipeline data por fecha (últimos 7 días)
    const pipelineData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

      const dayLeads = leads.filter((lead: any) => {
        const leadDate = new Date(lead.createdAt);
        return leadDate.toDateString() === date.toDateString();
      });

      pipelineData.push({
        date: dateStr,
        new: dayLeads.filter((l: any) => l.status === 'new').length,
        qualified: dayLeads.filter((l: any) => l.status === 'qualified').length,
        closed: dayLeads.filter((l: any) => l.status === 'closed').length,
      });
    }

    // Score promedio
    const scores = leads
      .map((lead: any) => lead.score?.combined || lead.score?.automatic || 0)
      .filter((s: number) => s > 0);
    const avgScore = scores.length > 0
      ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
      : 0;

    // Tiempo promedio en pipeline
    const timesInPipeline = leads
      .filter((lead: any) => lead.status === 'closed')
      .map((lead: any) => {
        const created = new Date(lead.createdAt).getTime();
        const updated = new Date(lead.updatedAt).getTime();
        return Math.ceil((updated - created) / (1000 * 60 * 60 * 24));
      });
    const avgTimeInPipeline =
      timesInPipeline.length > 0
        ? Math.round(
            timesInPipeline.reduce((a, b) => a + b, 0) / timesInPipeline.length
          )
        : 0;

    // Canal con mejor ROI (simplificado - basado en conversión)
    const roiByChannel = Object.entries(conversionBySource).map(([source, data]) => ({
      source,
      roi: data.leads > 0 ? (data.converted / data.leads) * 100 : 0,
    }));
    const topROIChannel =
      roiByChannel.length > 0
        ? roiByChannel.sort((a, b) => b.roi - a.roi)[0].source
        : 'N/A';

    return NextResponse.json({
      conversionRate,
      avgTimeInPipeline,
      avgScore,
      topROIChannel,
      conversionBySource: conversionBySourceArray,
      statusDistribution,
      scoreDistribution,
      timeInStage,
      pipelineData,
    });
  } catch (error: any) {
    console.error('Error generating advanced reports:', error);
    return NextResponse.json(
      { error: error.message || 'Error generating reports' },
      { status: 500 }
    );
  }
}

