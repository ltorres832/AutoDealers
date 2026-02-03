export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';

    // Calcular fecha de inicio según el rango
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate = new Date(0); // Todo el tiempo
    }

    const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);

    // Obtener datos de todos los tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    
    let totalSales = 0;
    let verifiedSales = 0;
    let externalSales = 0;
    let pendingVerification = 0;
    let fraudDetected = 0;
    let fraudScoreSum = 0;
    let fraudScoreCount = 0;
    let highRiskSales = 0;
    const earningsByPartner: Record<string, number> = {};
    const earningsByCategory: Record<string, number> = {};
    const dealerSales: Record<string, number> = {};
    const salesByDate: Record<string, { verified: number; external: number }> = {};

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;

      // Obtener ventas
      const salesSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('sales')
        .where('createdAt', '>=', startTimestamp)
        .get();

      salesSnapshot.docs.forEach((doc) => {
        const sale = doc.data();
        totalSales++;
        
        if (sale.status === 'verified' || sale.vehicleStatus === 'SOLD_VERIFIED') {
          verifiedSales++;
          const date = sale.createdAt?.toDate()?.toISOString().split('T')[0] || '';
          if (!salesByDate[date]) {
            salesByDate[date] = { verified: 0, external: 0 };
          }
          salesByDate[date].verified++;
        } else if (sale.status === 'external' || sale.vehicleStatus === 'SOLD_EXTERNAL') {
          externalSales++;
          const date = sale.createdAt?.toDate()?.toISOString().split('T')[0] || '';
          if (!salesByDate[date]) {
            salesByDate[date] = { verified: 0, external: 0 };
          }
          salesByDate[date].external++;
        } else {
          pendingVerification++;
        }

        // Contar ventas por dealer
        if (sale.dealerId) {
          dealerSales[sale.dealerId] = (dealerSales[sale.dealerId] || 0) + 1;
        }
      });

      // Obtener purchase intents
      const intentsSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('purchase_intents')
        .where('createdAt', '>=', startTimestamp)
        .get();

      intentsSnapshot.docs.forEach((doc) => {
        const intent = doc.data();
        const fraudScore = intent.fraudScore || 0;
        
        fraudScoreSum += fraudScore;
        fraudScoreCount++;
        
        if (fraudScore >= 31) {
          fraudDetected++;
        }
        
        if (fraudScore >= 61) {
          highRiskSales++;
        }
      });

      // Obtener earnings (solo admin)
      const earningsSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('admin_earnings')
        .where('createdAt', '>=', startTimestamp)
        .get();

      earningsSnapshot.docs.forEach((doc) => {
        const earning = doc.data();
        const amount = earning.amount || 0;
        const partner = earning.partner || 'unknown';
        const category = earning.category || 'other';

        earningsByPartner[partner] = (earningsByPartner[partner] || 0) + amount;
        earningsByCategory[category] = (earningsByCategory[category] || 0) + amount;
      });
    }

    // Obtener dealers con flags
    let dealersWithFlags = 0;
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const dealersSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('users')
        .where('role', '==', 'dealer')
        .get();

      dealersSnapshot.docs.forEach((doc) => {
        const dealer = doc.data();
        if (dealer.fraudFlags && dealer.fraudFlags.length > 0) {
          dealersWithFlags++;
        }
      });
    }

    // Top dealers
    const topDealers = Object.entries(dealerSales)
      .map(([dealerId, sales]) => ({ dealerId, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    // Preparar datos de tendencia
    const salesTrend = Object.entries(salesByDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      totalSales,
      verifiedSales,
      externalSales,
      pendingVerification,
      interactionsToSales: 0, // Se calculará después
      leadsToSales: 0, // Se calculará después
      fraudDetected,
      fraudScoreAverage: fraudScoreCount > 0 ? fraudScoreSum / fraudScoreCount : 0,
      highRiskSales,
      totalEarnings: Object.values(earningsByPartner).reduce((a, b) => a + b, 0),
      earningsByPartner,
      earningsByCategory,
      dealersWithFlags,
      topDealers,
      salesTrend,
    });
  } catch (error: any) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener KPIs' },
      { status: 500 }
    );
  }
}

