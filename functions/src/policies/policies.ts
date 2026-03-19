/**
 * Cloud Functions para Policies
 * 
 * Funcionalidades:
 * - Inicializar políticas por defecto
 * - Obtener políticas
 * - Crear/actualizar políticas
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Inicializar políticas por defecto
 */
export const initializePolicies = onCall(async (request) => {
  const authToken = request.auth?.token;

  if (!authToken || authToken.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores pueden inicializar políticas');
  }

  const defaultPolicies = [
    {
      type: 'privacy',
      title: 'Política de Privacidad',
      content: `# Política de Privacidad

## 1. Información que Recopilamos
Recopilamos información que usted nos proporciona directamente, información recopilada automáticamente e información de terceros.

## 2. Cómo Usamos su Información
Utilizamos la información recopilada para proporcionar y mejorar nuestros servicios.

## 3. Seguridad
Implementamos medidas de seguridad técnicas y organizativas para proteger su información.

Última actualización: ${new Date().toLocaleDateString('es-ES')}`,
      version: '1.0',
      language: 'es',
      isActive: true,
      isRequired: true,
      requiresAcceptance: true,
      applicableTo: ['public', 'dealer', 'seller'],
      effectiveDate: FieldValue.serverTimestamp(),
      createdBy: authToken.uid,
    },
    {
      type: 'terms',
      title: 'Términos y Condiciones',
      content: `# Términos y Condiciones

## 1. Aceptación de los Términos
Al acceder y usar esta plataforma, usted acepta estar sujeto a estos términos y condiciones.

## 2. Uso de la Plataforma
Usted se compromete a usar la plataforma de manera legal y ética.

Última actualización: ${new Date().toLocaleDateString('es-ES')}`,
      version: '1.0',
      language: 'es',
      isActive: true,
      isRequired: true,
      requiresAcceptance: true,
      applicableTo: ['public', 'dealer', 'seller'],
      effectiveDate: FieldValue.serverTimestamp(),
      createdBy: authToken.uid,
    },
  ];

  const createdPolicies: any[] = [];
  for (const policyData of defaultPolicies) {
    try {
      const policyRef = db.collection('policies').doc();
      await policyRef.set({
        ...policyData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      createdPolicies.push({
        id: policyRef.id,
        ...policyData,
      });
    } catch (error: any) {
      console.error(`Error creando política ${policyData.type}:`, error);
    }
  }

  return {
    success: true,
    message: `${createdPolicies.length} políticas creadas`,
    policies: createdPolicies,
  };
});

/**
 * Obtener políticas
 */
export const getPolicies = onCall(async (request) => {
  const { type, language, applicableTo } = request.data;

  let query: FirebaseFirestore.Query = db.collection('policies').where('isActive', '==', true);

  if (type) {
    query = query.where('type', '==', type);
  }
  if (language) {
    query = query.where('language', '==', language);
  }

  const snapshot = await query.get();
  let policies = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      effectiveDate: data.effectiveDate?.toDate?.() || data.effectiveDate,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    };
  });

  // Filtrar por applicableTo si se proporciona
  if (applicableTo) {
    policies = policies.filter((p) => p.applicableTo?.includes(applicableTo));
  }

  return { policies };
});

/**
 * Crear política
 */
export const createPolicy = onCall(async (request) => {
  const { policy } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || authToken.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores pueden crear políticas');
  }

  if (!policy || !policy.type || !policy.title || !policy.content) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const policyRef = db.collection('policies').doc();
  await policyRef.set({
    ...policy,
    createdBy: authToken.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const createdDoc = await policyRef.get();
  const createdData = createdDoc.data()!;

  return {
    id: policyRef.id,
    ...createdData,
    effectiveDate: createdData.effectiveDate?.toDate?.() || createdData.effectiveDate,
    createdAt: createdData.createdAt?.toDate?.() || createdData.createdAt,
    updatedAt: createdData.updatedAt?.toDate?.() || createdData.updatedAt,
  };
});

/**
 * Actualizar política
 */
export const updatePolicy = onCall(async (request) => {
  const { policyId, policy } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || authToken.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores pueden actualizar políticas');
  }

  if (!policyId || !policy) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const policyRef = db.collection('policies').doc(policyId);
  await policyRef.update({
    ...policy,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedDoc = await policyRef.get();
  const updatedData = updatedDoc.data()!;

  return {
    id: policyRef.id,
    ...updatedData,
    effectiveDate: updatedData.effectiveDate?.toDate?.() || updatedData.effectiveDate,
    createdAt: updatedData.createdAt?.toDate?.() || updatedData.createdAt,
    updatedAt: updatedData.updatedAt?.toDate?.() || updatedData.updatedAt,
  };
});


