import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getLeads } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const dateRange = searchParams.get('dateRange') || '30d';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calcular fechas
    const now = new Date();
    let dateFrom: Date;
    if (dateRange === 'custom' && startDate && endDate) {
      dateFrom = new Date(startDate);
      now.setTime(new Date(endDate).getTime());
    } else {
      const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
      dateFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    // Obtener leads
    let leads: any[] = [];
    if (tenantId) {
      leads = await getLeads(tenantId, {});
    } else {
      // Obtener de todos los tenants
      const tenantsSnapshot = await db.collection('tenants').get();
      for (const tenantDoc of tenantsSnapshot.docs) {
        const tenantLeads = await getLeads(tenantDoc.id, {});
        leads.push(...tenantLeads);
      }
    }

    // Filtrar por fecha
    leads = leads.filter(
      (lead) =>
        lead.createdAt >= dateFrom && (!endDate || lead.createdAt <= new Date(endDate))
    );

    // Obtener ventas
    let sales: any[] = [];
    if (tenantId) {
      const salesSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('sales')
        .where('createdAt', '>=', dateFrom)
        .get();
      sales = salesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      const tenantsSnapshot = await db.collection('tenants').get();
      for (const tenantDoc of tenantsSnapshot.docs) {
        const salesSnapshot = await db
          .collection('tenants')
          .doc(tenantDoc.id)
          .collection('sales')
          .where('createdAt', '>=', dateFrom)
          .get();
        sales.push(...salesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    }

    // Calcular métricas
    const conversionBySource = calculateConversionBySource(leads, sales);
    const avgTimePerStage = calculateAvgTimePerStage(leads);
    const scoreByStage = calculateScoreByStage(leads);
    const activityByDay = calculateActivityByDay(leads, sales, dateFrom, now);
    const performanceBySeller = await calculatePerformanceBySeller(leads, sales, tenantId);
    const roiByChannel = calculateROIByChannel(leads, sales);
    const responseRate = calculateResponseRate(leads);
    const closeRate = calculateCloseRate(leads, sales);

    return NextResponse.json({
      data: {
        conversionBySource,
        avgTimePerStage,
        scoreByStage,
        activityByDay,
        performanceBySeller,
        roiByChannel,
        responseRate,
        closeRate,
      },
    });
  } catch (error: any) {
    console.error('Error generating advanced reports:', error);
    return NextResponse.json(
      { error: error.message || 'Error generating reports' },
      { status: 500 }
    );
  }
}

function calculateConversionBySource(leads: any[], sales: any[]): any[] {
  const sourceMap = new Map<string, { leads: number; sales: number }>();

  leads.forEach((lead) => {
    const current = sourceMap.get(lead.source) || { leads: 0, sales: 0 };
    current.leads++;
    sourceMap.set(lead.source, current);
  });

  sales.forEach((sale) => {
    const lead = leads.find((l) => l.id === sale.leadId);
    if (lead) {
      const current = sourceMap.get(lead.source) || { leads: 0, sales: 0 };
      current.sales++;
      sourceMap.set(lead.source, current);
    }
  });

  return Array.from(sourceMap.entries()).map(([source, data]) => ({
    source,
    count: data.leads,
    conversionRate: data.leads > 0 ? data.sales / data.leads : 0,
  }));
}

function calculateAvgTimePerStage(leads: any[]): any[] {
  // Simplificado - en producción calcular tiempo real entre cambios de estado
  const stageMap = new Map<string, number[]>();

  leads.forEach((lead) => {
    if (!stageMap.has(lead.status)) {
      stageMap.set(lead.status, []);
    }
    // Estimación: tiempo desde creación hasta ahora
    const hours = (Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60);
    stageMap.get(lead.status)!.push(hours);
  });

  return Array.from(stageMap.entries()).map(([stage, times]) => ({
    stage,
    avgHours: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
  }));
}

function calculateScoreByStage(leads: any[]): any[] {
  const stageMap = new Map<string, number[]>();

  leads.forEach((lead) => {
    if (lead.score?.combined) {
      if (!stageMap.has(lead.status)) {
        stageMap.set(lead.status, []);
      }
      stageMap.get(lead.status)!.push(lead.score.combined);
    }
  });

  return Array.from(stageMap.entries()).map(([stage, scores]) => ({
    stage,
    avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
  }));
}

function calculateActivityByDay(leads: any[], sales: any[], from: Date, to: Date): any[] {
  const dayMap = new Map<string, { leads: number; sales: number }>();

  const current = new Date(from);
  while (current <= to) {
    const dateStr = current.toISOString().split('T')[0];
    dayMap.set(dateStr, { leads: 0, sales: 0 });
    current.setDate(current.getDate() + 1);
  }

  leads.forEach((lead) => {
    const dateStr = lead.createdAt.toISOString().split('T')[0];
    const day = dayMap.get(dateStr);
    if (day) day.leads++;
  });

  sales.forEach((sale) => {
    const date = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
    const dateStr = date.toISOString().split('T')[0];
    const day = dayMap.get(dateStr);
    if (day) day.sales++;
  });

  return Array.from(dayMap.entries()).map(([date, data]) => ({
    date,
    leads: data.leads,
    sales: data.sales,
  }));
}

async function calculatePerformanceBySeller(
  leads: any[],
  sales: any[],
  tenantId?: string | null
): Promise<any[]> {
  const sellerMap = new Map<string, { name: string; leads: number; sales: number }>();

  leads.forEach((lead) => {
    if (lead.assignedTo) {
      const current = sellerMap.get(lead.assignedTo) || {
        name: lead.assignedTo,
        leads: 0,
        sales: 0,
      };
      current.leads++;
      sellerMap.set(lead.assignedTo, current);
    }
  });

  sales.forEach((sale) => {
    if (sale.sellerId) {
      const current = sellerMap.get(sale.sellerId) || {
        name: sale.sellerId,
        leads: 0,
        sales: 0,
      };
      current.sales++;
      sellerMap.set(sale.sellerId, current);
    }
  });

  // Obtener nombres de usuarios
  const db = getFirestore();
  for (const [sellerId, data] of sellerMap.entries()) {
    try {
      const userDoc = await db.collection('users').doc(sellerId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        data.name = userData?.name || userData?.email || sellerId;
      }
    } catch (error) {
      console.error(`Error fetching user ${sellerId}:`, error);
    }
  }

  return Array.from(sellerMap.entries()).map(([sellerId, data]) => ({
    sellerId: sellerId,
    sellerName: data.name,
    leads: data.leads,
    sales: data.sales,
    conversionRate: data.leads > 0 ? data.sales / data.leads : 0,
  }));
}

function calculateROIByChannel(leads: any[], sales: any[]): any[] {
  // Simplificado - en producción obtener costos reales de marketing
  const channelCosts: Record<string, number> = {
    web: 50,
    whatsapp: 30,
    facebook: 100,
    instagram: 80,
    email: 20,
    sms: 10,
    phone: 0,
  };

  const channelMap = new Map<string, { cost: number; revenue: number }>();

  leads.forEach((lead) => {
    const cost = channelCosts[lead.source] || 0;
    const current = channelMap.get(lead.source) || { cost: 0, revenue: 0 };
    current.cost += cost;
    channelMap.set(lead.source, current);
  });

  sales.forEach((sale) => {
    const lead = leads.find((l) => l.id === sale.leadId);
    if (lead) {
      const current = channelMap.get(lead.source) || { cost: 0, revenue: 0 };
      current.revenue += sale.salePrice || sale.total || 0;
      channelMap.set(lead.source, current);
    }
  });

  return Array.from(channelMap.entries()).map(([channel, data]) => ({
    channel,
    cost: data.cost,
    revenue: data.revenue,
    roi: data.cost > 0 ? (data.revenue - data.cost) / data.cost : 0,
  }));
}

function calculateResponseRate(leads: any[]): number {
  const responded = leads.filter((lead) => {
    return lead.interactions && lead.interactions.some((i: any) => i.type === 'message');
  });
  return leads.length > 0 ? responded.length / leads.length : 0;
}

function calculateCloseRate(leads: any[], sales: any[]): number {
  const closedLeads = new Set(sales.map((s) => s.leadId).filter(Boolean));
  return leads.length > 0 ? closedLeads.size / leads.length : 0;
}
