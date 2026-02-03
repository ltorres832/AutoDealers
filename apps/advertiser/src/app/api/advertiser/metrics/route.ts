import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

// Helper para obtener clave de semana (YYYY-WW)
function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7)); // Ajustar al jueves de la semana
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const adId = searchParams.get('adId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const period = searchParams.get('period') || 'custom'; // 'custom', 'monthly', 'weekly'

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    // Calcular fechas según el período
    if (period === 'monthly') {
      // Último mes completo
      endDate = new Date();
      endDate.setDate(1); // Primer día del mes actual
      endDate.setHours(0, 0, 0, 0);
      startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'weekly') {
      // Última semana completa (lunes a domingo)
      endDate = new Date();
      const dayOfWeek = endDate.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Días hasta el lunes anterior
      endDate.setDate(endDate.getDate() - diff);
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Rango personalizado
      if (from) {
        startDate = new Date(from);
        startDate.setHours(0, 0, 0, 0);
      }
      if (to) {
        endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    // Si no se especifica rango, usar últimos 30 días
    if (!startDate || !endDate) {
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }

    // Obtener métricas mensuales
    const metrics: any[] = [];
    
    if (adId) {
      // Métricas de un anuncio específico
      const monthlyMetricsSnapshot = await db
        .collection('sponsored_content')
        .doc(adId)
        .collection('monthly_metrics')
        .where('month', '>=', `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`)
        .where('month', '<=', `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`)
        .orderBy('month', 'asc')
        .get();

      monthlyMetricsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        metrics.push({
          month: data.month,
          impressions: data.impressions || 0,
          clicks: data.clicks || 0,
          conversions: data.conversions || 0,
          ctr: (data.impressions || 0) > 0 ? ((data.clicks || 0) / (data.impressions || 0)) * 100 : 0,
        });
      });

      // Obtener datos del anuncio para métricas totales
      const adDoc = await db.collection('sponsored_content').doc(adId).get();
      if (adDoc.exists) {
        const adData = adDoc.data();
        return NextResponse.json({
          adId,
          totalImpressions: adData?.impressions || 0,
          totalClicks: adData?.clicks || 0,
          totalConversions: adData?.conversions || 0,
          totalCTR: (adData?.impressions || 0) > 0 ? ((adData?.clicks || 0) / (adData?.impressions || 0)) * 100 : 0,
          monthlyMetrics: metrics,
        });
      }
    } else {
      // Métricas de todos los anuncios del anunciante
      const adsSnapshot = await db
        .collection('sponsored_content')
        .where('advertiserId', '==', auth.userId)
        .get();

      let totalImpressions = 0;
      let totalClicks = 0;
      let totalConversions = 0;

      const monthlyMap: Record<string, { impressions: number; clicks: number; conversions: number }> = {};

      for (const adDoc of adsSnapshot.docs) {
        const adData = adDoc.data();
        totalImpressions += adData?.impressions || 0;
        totalClicks += adData?.clicks || 0;
        totalConversions += adData?.conversions || 0;

        // Obtener métricas mensuales de este anuncio
        const monthlyMetricsSnapshot = await db
          .collection('sponsored_content')
          .doc(adDoc.id)
          .collection('monthly_metrics')
          .where('month', '>=', `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`)
          .where('month', '<=', `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`)
          .get();

        monthlyMetricsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const month = data.month;
          if (!monthlyMap[month]) {
            monthlyMap[month] = { impressions: 0, clicks: 0, conversions: 0 };
          }
          monthlyMap[month].impressions += data.impressions || 0;
          monthlyMap[month].clicks += data.clicks || 0;
          monthlyMap[month].conversions += data.conversions || 0;
        });
      }

      // Convertir a array ordenado
      const monthlyMetrics = Object.entries(monthlyMap)
        .map(([month, data]) => ({
          month,
          impressions: data.impressions,
          clicks: data.clicks,
          conversions: data.conversions,
          ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Calcular métricas diarias y semanales basadas en el período
      const dailyMetrics: Record<string, { impressions: number; clicks: number; conversions: number }> = {};
      const weeklyMetrics: Record<string, { impressions: number; clicks: number; conversions: number }> = {};

      // Obtener eventos de impresiones y clics desde la colección de eventos (si existe)
      // Por ahora, distribuir las métricas totales proporcionalmente según el período
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Generar métricas diarias distribuidas (simulado - en producción deberías tener eventos reales)
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const weekKey = getWeekKey(currentDate);
        
        // Distribución proporcional simple (en producción usar eventos reales)
        dailyMetrics[dateKey] = {
          impressions: Math.floor(totalImpressions / daysDiff),
          clicks: Math.floor(totalClicks / daysDiff),
          conversions: Math.floor(totalConversions / daysDiff),
        };
        
        if (!weeklyMetrics[weekKey]) {
          weeklyMetrics[weekKey] = { impressions: 0, clicks: 0, conversions: 0 };
        }
        weeklyMetrics[weekKey].impressions += dailyMetrics[dateKey].impressions;
        weeklyMetrics[weekKey].clicks += dailyMetrics[dateKey].clicks;
        weeklyMetrics[weekKey].conversions += dailyMetrics[dateKey].conversions;
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Formatear métricas según el período solicitado
      let periodMetrics: any[] = [];
      if (period === 'weekly') {
        periodMetrics = Object.entries(weeklyMetrics)
          .map(([week, data]) => ({
            period: week,
            impressions: data.impressions,
            clicks: data.clicks,
            conversions: data.conversions,
            ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
          }))
          .sort((a, b) => a.period.localeCompare(b.period));
      } else if (period === 'monthly') {
        periodMetrics = monthlyMetrics;
      } else {
        // Custom: mostrar diario
        periodMetrics = Object.entries(dailyMetrics)
          .map(([date, data]) => ({
            period: date,
            impressions: data.impressions,
            clicks: data.clicks,
            conversions: data.conversions,
            ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
          }))
          .sort((a, b) => a.period.localeCompare(b.period));
      }

      return NextResponse.json({
        totalImpressions,
        totalClicks,
        totalConversions,
        totalCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        monthlyMetrics: period === 'monthly' ? periodMetrics : monthlyMetrics,
        weeklyMetrics: period === 'weekly' ? periodMetrics : [],
        dailyMetrics: period === 'custom' ? periodMetrics : [],
      });
    }

    return NextResponse.json({
      metrics,
    });
  } catch (error: any) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

