// Sistema de métricas mensuales para advertisers

import { getFirestore } from './firebase';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Registra una impresión y actualiza métricas mensuales
 */
export async function recordMonthlyImpression(
  contentId: string,
  advertiserId: string
): Promise<void> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Actualizar métrica mensual
  const metricsRef = getDb().collection('sponsored_content')
    .doc(contentId)
    .collection('monthly_metrics')
    .doc(monthKey);

  const metricsDoc = await metricsRef.get();
  
  if (metricsDoc.exists) {
    await metricsRef.update({
      impressions: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await metricsRef.set({
      month: monthKey,
      impressions: 1,
      clicks: 0,
      conversions: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // También actualizar el campo directo para compatibilidad
  await getDb().collection('sponsored_content').doc(contentId).update({
    impressions: admin.firestore.FieldValue.increment(1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Obtiene métricas mensuales de un contenido
 */
export async function getMonthlyMetrics(
  contentId: string,
  month?: string
): Promise<{
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
}> {
  const now = new Date();
  const monthKey = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const metricsDoc = await getDb().collection('sponsored_content')
    .doc(contentId)
    .collection('monthly_metrics')
    .doc(monthKey)
    .get();

  if (!metricsDoc.exists) {
    return {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
    };
  }

  const data = metricsDoc.data()!;
  const impressions = data.impressions || 0;
  const clicks = data.clicks || 0;
  const conversions = data.conversions || 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  return {
    impressions,
    clicks,
    conversions,
    ctr,
  };
}

/**
 * Obtiene métricas mensuales totales de un anunciante
 */
export async function getAdvertiserMonthlyMetrics(
  advertiserId: string,
  month?: string
): Promise<{
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  averageCTR: number;
  campaigns: Array<{
    contentId: string;
    title: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
}> {
  const now = new Date();
  const monthKey = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Obtener todas las campañas activas del anunciante
  const campaignsSnapshot = await getDb().collection('sponsored_content')
    .where('advertiserId', '==', advertiserId)
    .where('status', '==', 'active')
    .get();

  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  const campaigns: Array<{
    contentId: string;
    title: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }> = [];

  for (const campaignDoc of campaignsSnapshot.docs) {
    const campaign = campaignDoc.data();
    const metrics = await getMonthlyMetrics(campaignDoc.id, monthKey);

    totalImpressions += metrics.impressions;
    totalClicks += metrics.clicks;
    totalConversions += metrics.conversions;

    campaigns.push({
      contentId: campaignDoc.id,
      title: campaign.title || 'Sin título',
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      ctr: metrics.ctr,
    });
  }

  const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return {
    totalImpressions,
    totalClicks,
    totalConversions,
    averageCTR,
    campaigns,
  };
}

