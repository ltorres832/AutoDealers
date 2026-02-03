// Sistema de A/B Testing para contenido patrocinado

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

export interface ABTestVariant {
  id: string;
  contentId: string;
  variantName: string; // 'A', 'B', 'C', etc.
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  weight: number; // Peso de distribución (ej: 50 = 50%)
  impressions: number;
  clicks: number;
  conversions: number;
  isWinner?: boolean;
}

export interface ABTest {
  id: string;
  advertiserId: string;
  testName: string;
  variants: ABTestVariant[];
  status: 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  trafficSplit: 'equal' | 'weighted'; // Distribución igual o por peso
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Crea un test A/B para contenido patrocinado
 */
export async function createABTest(
  advertiserId: string,
  testName: string,
  variants: Omit<ABTestVariant, 'id' | 'impressions' | 'clicks' | 'conversions'>[],
  trafficSplit: 'equal' | 'weighted' = 'equal'
): Promise<ABTest> {
  const testRef = getDb().collection('ab_tests').doc();

  const abTest: Omit<ABTest, 'id'> = {
    advertiserId,
    testName,
    variants: variants.map((v, index) => ({
      ...v,
      id: `variant-${index}`,
      impressions: 0,
      clicks: 0,
      conversions: 0,
    })),
    status: 'active',
    startDate: new Date(),
    trafficSplit,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await testRef.set({
    ...abTest,
    startDate: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  return {
    id: testRef.id,
    ...abTest,
  };
}

/**
 * Selecciona una variante para mostrar según distribución de tráfico
 */
export function selectVariant(variants: ABTestVariant[], trafficSplit: 'equal' | 'weighted'): ABTestVariant {
  if (variants.length === 0) {
    throw new Error('No hay variantes disponibles');
  }

  if (variants.length === 1) {
    return variants[0];
  }

  if (trafficSplit === 'equal') {
    // Distribución igual: seleccionar aleatoriamente
    const randomIndex = Math.floor(Math.random() * variants.length);
    return variants[randomIndex];
  } else {
    // Distribución por peso
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const variant of variants) {
      currentWeight += variant.weight;
      if (random <= currentWeight) {
        return variant;
      }
    }
    
    // Fallback al último
    return variants[variants.length - 1];
  }
}

/**
 * Obtiene el test A/B activo para un contenido
 */
export async function getActiveABTestForContent(contentId: string): Promise<ABTest | null> {
  const snapshot = await getDb().collection('ab_tests')
    .where('status', '==', 'active')
    .get();

  for (const doc of snapshot.docs) {
    const test = doc.data() as any;
    const hasVariant = test.variants.some((v: any) => v.contentId === contentId);
    if (hasVariant) {
      return {
        id: doc.id,
        ...test,
        startDate: test.startDate?.toDate() || new Date(),
        endDate: test.endDate?.toDate(),
        createdAt: test.createdAt?.toDate() || new Date(),
        updatedAt: test.updatedAt?.toDate() || new Date(),
      };
    }
  }

  return null;
}

/**
 * Actualiza métricas de una variante
 */
export async function updateVariantMetrics(
  testId: string,
  variantId: string,
  type: 'impression' | 'click' | 'conversion'
): Promise<void> {
  const testRef = getDb().collection('ab_tests').doc(testId);
  const testDoc = await testRef.get();

  if (!testDoc.exists) {
    throw new Error('Test A/B no encontrado');
  }

  const test = testDoc.data() as any;
  const variants = test.variants || [];

  const variantIndex = variants.findIndex((v: any) => v.id === variantId);
  if (variantIndex === -1) {
    throw new Error('Variante no encontrada');
  }

  const updateField = type === 'impression' ? 'impressions' : type === 'click' ? 'clicks' : 'conversions';
  
  variants[variantIndex][updateField] = (variants[variantIndex][updateField] || 0) + 1;

  await testRef.update({
    variants,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Determina el ganador del test A/B basado en CTR
 */
export async function determineABTestWinner(testId: string): Promise<string | null> {
  const testDoc = await getDb().collection('ab_tests').doc(testId).get();
  if (!testDoc.exists) {
    return null;
  }

  const test = testDoc.data() as any;
  const variants = test.variants || [];

  if (variants.length === 0) {
    return null;
  }

  // Calcular CTR para cada variante
  const variantsWithCTR = variants.map((v: any) => ({
    ...v,
    ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
  }));

  // Ordenar por CTR descendente
  variantsWithCTR.sort((a: any, b: any) => b.ctr - a.ctr);

  // El ganador es el que tiene mayor CTR con al menos 100 impresiones
  const winner = variantsWithCTR.find((v: any) => v.impressions >= 100);

  if (winner) {
    // Marcar ganador y actualizar
    const updatedVariants = variants.map((v: any) => ({
      ...v,
      isWinner: v.id === winner.id,
    }));

    await getDb().collection('ab_tests').doc(testId).update({
      variants: updatedVariants,
      status: 'completed',
      endDate: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return winner.id;
  }

  return null;
}

