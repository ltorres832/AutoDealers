// Sistema de límites y validaciones para advertisers según plan

import { getFirestore } from './firebase';
import { getAdvertiserById } from './advertisers';
import * as admin from 'firebase-admin';

const db = getFirestore();

export interface PlanLimits {
  maxImpressionsPerMonth: number | null; // null = ilimitado
  maxBanners: number;
  allowedPlacements: ('hero' | 'sidebar' | 'sponsors_section' | 'between_content')[];
  hasAdvancedDashboard: boolean;
  hasAdvancedMetrics: boolean;
  hasBasicTargeting: boolean;
  hasAdvancedTargeting: boolean;
  hasABTesting: boolean;
}

export const PLAN_LIMITS: Record<'starter' | 'professional' | 'premium', PlanLimits> = {
  starter: {
    maxImpressionsPerMonth: 10000,
    maxBanners: 1,
    allowedPlacements: ['sponsors_section'],
    hasAdvancedDashboard: false,
    hasAdvancedMetrics: false,
    hasBasicTargeting: false,
    hasAdvancedTargeting: false,
    hasABTesting: false,
  },
  professional: {
    maxImpressionsPerMonth: 50000,
    maxBanners: 2,
    allowedPlacements: ['sponsors_section', 'sidebar'],
    hasAdvancedDashboard: true,
    hasAdvancedMetrics: true,
    hasBasicTargeting: true,
    hasAdvancedTargeting: false,
    hasABTesting: false,
  },
  premium: {
    maxImpressionsPerMonth: null, // Ilimitado
    maxBanners: 999, // Prácticamente ilimitado
    allowedPlacements: ['hero', 'sidebar', 'sponsors_section', 'between_content'],
    hasAdvancedDashboard: true,
    hasAdvancedMetrics: true,
    hasBasicTargeting: true,
    hasAdvancedTargeting: true,
    hasABTesting: true,
  },
};

/**
 * Obtiene los límites del plan de un anunciante
 */
export async function getAdvertiserPlanLimits(advertiserId: string): Promise<PlanLimits> {
  const advertiser = await getAdvertiserById(advertiserId);
  if (!advertiser) {
    throw new Error('Anunciante no encontrado');
  }
  if (!advertiser.plan) {
    throw new Error('El anunciante no tiene un plan activo');
  }
  return PLAN_LIMITS[advertiser.plan];
}

/**
 * Verifica si un anunciante puede crear más banners
 */
export async function canCreateBanner(
  advertiserId: string,
  placement: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content'
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getAdvertiserPlanLimits(advertiserId);
  
  // Verificar si el placement está permitido
  if (!limits.allowedPlacements.includes(placement)) {
    return {
      allowed: false,
      reason: `Tu plan no permite banners en ${placement}. Planes permitidos: ${limits.allowedPlacements.join(', ')}`,
    };
  }

  // Contar banners activos del anunciante
  const now = admin.firestore.Timestamp.now();
  const activeBanners = await db
    .collection('sponsored_content')
    .where('advertiserId', '==', advertiserId)
    .where('status', 'in', ['active', 'approved', 'pending'])
    .where('endDate', '>=', now)
    .get();

  const currentCount = activeBanners.size;

  if (currentCount >= limits.maxBanners) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${limits.maxBanners} banner(s) activo(s) de tu plan. Actualiza a un plan superior para más banners.`,
    };
  }

  return { allowed: true };
}

/**
 * Verifica si un anunciante puede recibir más impresiones este mes
 */
export async function canReceiveImpressions(advertiserId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const limits = await getAdvertiserPlanLimits(advertiserId);
  
  // Si es ilimitado, siempre permitir
  if (limits.maxImpressionsPerMonth === null) {
    return { allowed: true, remaining: null as any };
  }

  // Calcular impresiones del mes actual
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const startTimestamp = admin.firestore.Timestamp.fromDate(startOfMonth);
  const endTimestamp = admin.firestore.Timestamp.fromDate(endOfMonth);

  // Obtener todas las campañas activas del anunciante
  const campaigns = await db
    .collection('sponsored_content')
    .where('advertiserId', '==', advertiserId)
    .where('status', '==', 'active')
    .get();

  let totalImpressions = 0;
  for (const campaignDoc of campaigns.docs) {
    const campaign = campaignDoc.data();
    // Obtener impresiones del mes desde métricas
    // Asumimos que las impresiones se registran en el campo impressions
    // En producción, podrías tener una colección separada de métricas diarias
    totalImpressions += campaign.impressions || 0;
  }

  const remaining = limits.maxImpressionsPerMonth - totalImpressions;

  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${limits.maxImpressionsPerMonth.toLocaleString()} impresiones/mes de tu plan. Actualiza a un plan superior.`,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining,
  };
}

/**
 * Obtiene el uso actual de impresiones del mes
 */
export async function getMonthlyImpressionsUsage(advertiserId: string): Promise<{
  used: number;
  limit: number | null;
  percentage: number;
  remaining: number | null;
}> {
  const limits = await getAdvertiserPlanLimits(advertiserId);
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Obtener todas las campañas activas del anunciante
  const campaigns = await db
    .collection('sponsored_content')
    .where('advertiserId', '==', advertiserId)
    .where('status', '==', 'active')
    .get();

  let totalImpressions = 0;
  for (const campaignDoc of campaigns.docs) {
    const campaign = campaignDoc.data();
    totalImpressions += campaign.impressions || 0;
  }

  if (limits.maxImpressionsPerMonth === null) {
    return {
      used: totalImpressions,
      limit: null,
      percentage: 0,
      remaining: null,
    };
  }

  const percentage = (totalImpressions / limits.maxImpressionsPerMonth) * 100;
  const remaining = Math.max(0, limits.maxImpressionsPerMonth - totalImpressions);

  return {
    used: totalImpressions,
    limit: limits.maxImpressionsPerMonth,
    percentage,
    remaining,
  };
}

/**
 * Verifica si una impresión puede ser registrada (antes de incrementar)
 */
export async function checkAndIncrementImpression(
  contentId: string,
  advertiserId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const canReceive = await canReceiveImpressions(advertiserId);
  
  if (!canReceive.allowed) {
    return {
      allowed: false,
      reason: canReceive.reason,
    };
  }

  // Si está permitido, la impresión se registrará normalmente
  return { allowed: true };
}

