// Sistema de Features Dinámicas - Permite crear features personalizadas

import { getFirestore } from './firebase';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}
import * as admin from 'firebase-admin';

const db = getFirestore();

export type FeatureType = 'boolean' | 'number' | 'string' | 'select';
export type FeatureCategory = 
  | 'domains'
  | 'ai'
  | 'social'
  | 'marketplace'
  | 'reports'
  | 'api'
  | 'marketing'
  | 'crm'
  | 'content'
  | 'services'
  | 'support'
  | 'custom';

export interface DynamicFeature {
  id: string;
  key: string; // Clave única (ej: 'customFeature1')
  name: string; // Nombre para mostrar
  description: string;
  type: FeatureType;
  category: FeatureCategory;
  defaultValue?: boolean | number | string;
  options?: string[]; // Para tipo 'select'
  min?: number; // Para tipo 'number'
  max?: number; // Para tipo 'number'
  unit?: string; // Para tipo 'number' (ej: 'GB', 'MB', 'veces')
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // ID del admin que lo creó
}

/**
 * Crea una nueva feature dinámica
 */
export async function createDynamicFeature(
  feature: Omit<DynamicFeature, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  createdBy: string
): Promise<DynamicFeature> {
  // Validar que la clave sea única
  const existing = await getDb().collection('dynamic_features')
    .where('key', '==', feature.key)
    .get();

  if (!existing.empty) {
    throw new Error(`Ya existe una feature con la clave "${feature.key}"`);
  }

  const docRef = getDb().collection('dynamic_features').doc();
  
  await docRef.set({
    ...feature,
    createdBy,
    isActive: feature.isActive !== undefined ? feature.isActive : true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  return {
    id: docRef.id,
    ...feature,
    createdBy: createdBy || 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Obtiene todas las features dinámicas activas
 */
export async function getDynamicFeatures(
  category?: FeatureCategory,
  activeOnly: boolean = true
): Promise<DynamicFeature[]> {
  let query: admin.firestore.Query = getDb().collection('dynamic_features');

  if (activeOnly) {
    query = query.where('isActive', '==', true);
  }

  if (category) {
    query = query.where('category', '==', category);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as DynamicFeature;
  });
}

/**
 * Obtiene una feature dinámica por su clave
 */
export async function getDynamicFeatureByKey(key: string): Promise<DynamicFeature | null> {
  const snapshot = await getDb().collection('dynamic_features')
    .where('key', '==', key)
    .where('isActive', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
  } as DynamicFeature;
}

/**
 * Actualiza una feature dinámica
 */
export async function updateDynamicFeature(
  featureId: string,
  updates: Partial<DynamicFeature>
): Promise<void> {
  await getDb().collection('dynamic_features').doc(featureId).update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);
}

/**
 * Elimina (desactiva) una feature dinámica
 */
export async function deleteDynamicFeature(featureId: string): Promise<void> {
  await getDb().collection('dynamic_features').doc(featureId).update({
    isActive: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);
}

/**
 * Obtiene todas las features dinámicas y las convierte en un objeto para usar en membresías
 */
export async function getDynamicFeaturesAsObject(): Promise<Record<string, any>> {
  const features = await getDynamicFeatures(undefined, true);
  const result: Record<string, any> = {};

  features.forEach((feature) => {
    result[feature.key] = feature.defaultValue !== undefined 
      ? feature.defaultValue 
      : feature.type === 'boolean' 
        ? false 
        : feature.type === 'number' 
          ? 0 
          : '';
  });

  return result;
}

/**
 * Valida el valor de una feature dinámica según su tipo
 */
export function validateDynamicFeatureValue(
  feature: DynamicFeature,
  value: any
): { valid: boolean; error?: string } {
  switch (feature.type) {
    case 'boolean':
      if (typeof value !== 'boolean') {
        return { valid: false, error: `El valor debe ser true o false` };
      }
      return { valid: true };

    case 'number':
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) {
        return { valid: false, error: `El valor debe ser un número` };
      }
      if (feature.min !== undefined && numValue < feature.min) {
        return { valid: false, error: `El valor mínimo es ${feature.min}` };
      }
      if (feature.max !== undefined && numValue > feature.max) {
        return { valid: false, error: `El valor máximo es ${feature.max}` };
      }
      return { valid: true };

    case 'string':
      if (typeof value !== 'string') {
        return { valid: false, error: `El valor debe ser un texto` };
      }
      return { valid: true };

    case 'select':
      if (!feature.options || !feature.options.includes(value)) {
        return { valid: false, error: `El valor debe ser uno de: ${feature.options?.join(', ') || ''}` };
      }
      return { valid: true };

    default:
      return { valid: false, error: `Tipo de feature no reconocido` };
  }
}

