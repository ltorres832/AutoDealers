// Sistema de Políticas y Disclosures

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

export interface Policy {
  id: string;
  type: 'privacy' | 'terms' | 'refund' | 'shipping' | 'warranty' | 'data_protection' | 'cookie' | 'disclaimer' | 'custom';
  title: string;
  content: string;
  version: string;
  language: 'es' | 'en';
  isActive: boolean;
  isRequired: boolean; // Si es requerida para aceptar antes de usar la plataforma
  requiresAcceptance: boolean; // Si requiere aceptación explícita del usuario
  applicableTo: ('admin' | 'dealer' | 'seller' | 'public' | 'advertiser')[];
  tenantId?: string; // Si es específica de un tenant
  effectiveDate: Date;
  expirationDate?: Date;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
}

export interface UserPolicyAcceptance {
  id: string;
  userId: string;
  policyId: string;
  policyVersion: string;
  acceptedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Crea una nueva política
 */
export async function createPolicy(
  policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Policy> {
  const docRef = getDb().collection('policies').doc();
  
  const policyData: any = {
    ...policy,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  await docRef.set(policyData);
  
  return {
    id: docRef.id,
    ...policy,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Obtiene todas las políticas activas para un tipo y rol específicos
 */
export async function getActivePolicies(
  type: Policy['type'],
  role: 'admin' | 'dealer' | 'seller' | 'public' | 'advertiser',
  tenantId?: string,
  language: 'es' | 'en' = 'es'
): Promise<Policy[]> {
  let query: admin.firestore.Query = getDb().collection('policies')
    .where('type', '==', type)
    .where('isActive', '==', true)
    .where('language', '==', language)
    .where('applicableTo', 'array-contains', role);
  
  // Si hay tenantId, buscar políticas específicas del tenant o globales
  if (tenantId) {
    // Primero buscar políticas específicas del tenant
    const tenantPolicies = await query
      .where('tenantId', '==', tenantId)
      .orderBy('effectiveDate', 'desc')
      .get();
    
    if (!tenantPolicies.empty) {
      return tenantPolicies.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        effectiveDate: doc.data().effectiveDate?.toDate() || new Date(),
        expirationDate: doc.data().expirationDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Policy[];
    }
  }
  
  // Buscar políticas globales (sin tenantId)
  const globalPolicies = await query
    .where('tenantId', '==', null)
    .orderBy('effectiveDate', 'desc')
    .get();
  
  return globalPolicies.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    effectiveDate: doc.data().effectiveDate?.toDate() || new Date(),
    expirationDate: doc.data().expirationDate?.toDate(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Policy[];
}

/**
 * Obtiene todas las políticas requeridas que el usuario aún no ha aceptado
 */
export async function getRequiredPoliciesForUser(
  userId: string,
  role: 'admin' | 'dealer' | 'seller' | 'public' | 'advertiser',
  tenantId?: string,
  language: 'es' | 'en' = 'es'
): Promise<Policy[]> {
  // Obtener todas las políticas requeridas
  const allRequiredPolicies = await getDb().collection('policies')
    .where('isRequired', '==', true)
    .where('isActive', '==', true)
    .where('language', '==', language)
    .where('applicableTo', 'array-contains', role)
    .get();
  
  // Obtener políticas aceptadas por el usuario
  const acceptedPoliciesSnapshot = await getDb().collection('policy_acceptances')
    .where('userId', '==', userId)
    .get();
  
  const acceptedPolicyIds = new Set(
    acceptedPoliciesSnapshot.docs.map(doc => doc.data().policyId)
  );
  
  // Filtrar políticas no aceptadas y verificar fechas
  const now = new Date();
  const requiredPolicies: Policy[] = [];
  
  allRequiredPolicies.docs.forEach(doc => {
    const policyData = doc.data();
    const effectiveDate = policyData.effectiveDate?.toDate() || new Date();
    const expirationDate = policyData.expirationDate?.toDate();
    
    // Verificar si la política está vigente
    if (effectiveDate > now) return; // Aún no es efectiva
    if (expirationDate && expirationDate < now) return; // Ya expiró
    
    // Verificar si es específica del tenant o global
    if (policyData.tenantId && policyData.tenantId !== tenantId) return;
    if (!policyData.tenantId && tenantId) {
      // Es global, verificar si hay una específica del tenant que la reemplace
      // (esto se manejaría en la lógica de getActivePolicies)
    }
    
    // Verificar si el usuario ya la aceptó (y si la versión es la misma)
    const acceptance = acceptedPoliciesSnapshot.docs.find(
      accDoc => accDoc.data().policyId === doc.id
    );
    
    if (acceptance) {
      const acceptedVersion = acceptance.data().policyVersion;
      if (acceptedVersion === policyData.version) {
        return; // Ya aceptó esta versión
      }
    }
    
    requiredPolicies.push({
      id: doc.id,
      ...policyData,
      effectiveDate,
      expirationDate,
      createdAt: policyData.createdAt?.toDate() || new Date(),
      updatedAt: policyData.updatedAt?.toDate() || new Date(),
    } as Policy);
  });
  
  return requiredPolicies;
}

/**
 * Registra la aceptación de una política por un usuario
 */
export async function acceptPolicy(
  userId: string,
  policyId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<UserPolicyAcceptance> {
  // Obtener la política
  const policyDoc = await getDb().collection('policies').doc(policyId).get();
  if (!policyDoc.exists) {
    throw new Error('Política no encontrada');
  }
  
  const policyData = policyDoc.data();
  
  // Crear registro de aceptación
  const docRef = getDb().collection('policy_acceptances').doc();
  const acceptanceData: any = {
    userId,
    policyId,
    policyVersion: policyData?.version || '1.0',
    acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    ipAddress,
    userAgent,
  };
  
  await docRef.set(acceptanceData);
  
  return {
    id: docRef.id,
    userId,
    policyId,
    policyVersion: policyData?.version || '1.0',
    acceptedAt: new Date(),
    ipAddress,
    userAgent,
  };
}

/**
 * Verifica si un usuario ha aceptado una política específica
 */
export async function hasUserAcceptedPolicy(
  userId: string,
  policyId: string,
  version?: string
): Promise<boolean> {
  let query: admin.firestore.Query = getDb().collection('policy_acceptances')
    .where('userId', '==', userId)
    .where('policyId', '==', policyId);
  
  if (version) {
    query = query.where('policyVersion', '==', version);
  }
  
  const snapshot = await query.limit(1).get();
  return !snapshot.empty;
}

/**
 * Obtiene todas las políticas (para admin)
 */
export async function getAllPolicies(
  tenantId?: string,
  language?: 'es' | 'en'
): Promise<Policy[]> {
  let query: admin.firestore.Query = getDb().collection('policies');
  
  if (tenantId) {
    query = query.where('tenantId', '==', tenantId);
  }
  
  if (language) {
    query = query.where('language', '==', language);
  }
  
  const snapshot = await query.orderBy('createdAt', 'desc').get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    effectiveDate: doc.data().effectiveDate?.toDate() || new Date(),
    expirationDate: doc.data().expirationDate?.toDate(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Policy[];
}

/**
 * Actualiza una política
 */
export async function updatePolicy(
  policyId: string,
  updates: Partial<Policy>
): Promise<Policy> {
  const docRef = getDb().collection('policies').doc(policyId);
  
  const updateData: any = {
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  delete updateData.id;
  delete updateData.createdAt;
  
  await docRef.update(updateData);
  
  const updated = await docRef.get();
  return {
    id: updated.id,
    ...updated.data(),
    effectiveDate: updated.data()?.effectiveDate?.toDate() || new Date(),
    expirationDate: updated.data()?.expirationDate?.toDate(),
    createdAt: updated.data()?.createdAt?.toDate() || new Date(),
    updatedAt: updated.data()?.updatedAt?.toDate() || new Date(),
  } as Policy;
}

/**
 * Elimina una política (soft delete)
 */
export async function deletePolicy(policyId: string): Promise<void> {
  await getDb().collection('policies').doc(policyId).update({
    isActive: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

