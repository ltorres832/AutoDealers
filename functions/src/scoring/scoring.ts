/**
 * Cloud Functions para Scoring
 * 
 * Funcionalidades:
 * - Obtener configuración de scoring
 * - Crear/actualizar/eliminar reglas de scoring
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Obtener configuración de scoring
 */
export const getScoringConfig = onCall(async (request) => {
  const { tenantId } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const configDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('scoring_config')
    .doc('main')
    .get();

  if (!configDoc.exists) {
    return { rules: [] };
  }

  const configData = configDoc.data()!;
  return { rules: configData.rules || [] };
});

/**
 * Crear regla de scoring
 */
export const createScoringRule = onCall(async (request) => {
  const { tenantId, rule } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !rule) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const configRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('scoring_config')
    .doc('main');

  const configDoc = await configRef.get();
  const currentRules = configDoc.exists ? (configDoc.data()?.rules || []) : [];

  const newRule = {
    id: `rule_${Date.now()}`,
    tenantId,
    name: rule.name,
    enabled: rule.enabled !== false,
    conditions: rule.conditions || [],
    points: rule.points || 10,
    priority: rule.priority || 1,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const updatedRules = [...currentRules, newRule];

  await configRef.set({
    rules: updatedRules,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { rule: newRule };
});

/**
 * Actualizar regla de scoring
 */
export const updateScoringRule = onCall(async (request) => {
  const { tenantId, ruleId, updates } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !ruleId || !updates) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const configRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('scoring_config')
    .doc('main');

  const configDoc = await configRef.get();
  if (!configDoc.exists) {
    throw new HttpsError('not-found', 'Configuración de scoring no encontrada');
  }

  const currentRules = configDoc.data()?.rules || [];
  const updatedRules = currentRules.map((rule: any) =>
    rule.id === ruleId
      ? { ...rule, ...updates, updatedAt: FieldValue.serverTimestamp() }
      : rule
  );

  await configRef.update({
    rules: updatedRules,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedRule = updatedRules.find((r: any) => r.id === ruleId);
  return { rule: updatedRule };
});

/**
 * Eliminar regla de scoring
 */
export const deleteScoringRule = onCall(async (request) => {
  const { tenantId, ruleId } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !ruleId) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const configRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('scoring_config')
    .doc('main');

  const configDoc = await configRef.get();
  if (!configDoc.exists) {
    throw new HttpsError('not-found', 'Configuración de scoring no encontrada');
  }

  const currentRules = configDoc.data()?.rules || [];
  const updatedRules = currentRules.filter((rule: any) => rule.id !== ruleId);

  await configRef.update({
    rules: updatedRules,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});


