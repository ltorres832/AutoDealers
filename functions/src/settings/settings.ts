/**
 * Cloud Functions para Settings
 * 
 * Funcionalidades:
 * - Obtener y actualizar configuración del sistema
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

function getDefaultSettings() {
  return {
    vehicleStates: {
      enabled: true,
      allowedStates: ['AVAILABLE', 'IN_NEGOTIATION', 'SOLD_PENDING_VERIFICATION', 'SOLD_VERIFIED', 'SOLD_EXTERNAL'],
    },
    purchaseIntent: {
      enabled: true,
      requireInteraction: true,
      minInteractionTime: 1,
      autoVerify: false,
      fraudThreshold: 30,
    },
    antifraud: {
      enabled: true,
      checkClientCreation: true,
      checkIPMatch: true,
      checkInteractionTime: true,
      checkExternalSales: true,
      checkDuplicateVIN: true,
      checkMultipleSales: true,
      autoFlagThreshold: 31,
      autoSuspendThreshold: 61,
    },
    certificates: {
      enabled: true,
      autoGenerate: true,
      includeQR: true,
      emailToClient: true,
    },
    roadside: {
      enabled: true,
      durationMonths: 6,
      autoActivate: true,
    },
    partners: {
      insurance: {
        enabled: true,
        visible: false,
        referralFee: 0,
      },
      banks: {
        enabled: true,
        visible: false,
        referralFee: 0,
      },
      roadside: {
        enabled: true,
        visible: false,
        referralFee: 0,
      },
    },
    earnings: {
      enabled: true,
      visibleToAdmin: true,
      autoTrack: true,
    },
    dashboard: {
      showKPIs: true,
      showFraudAlerts: true,
      showEarnings: true,
      showTopDealers: true,
    },
  };
}

/**
 * Obtener configuración del sistema
 */
export const getSettings = onCall(async (request) => {
  const authToken = request.auth?.token;

  if (!authToken || authToken.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores pueden acceder');
  }

  const settingsDoc = await db.collection('system_settings').doc('main').get();

  if (!settingsDoc.exists) {
    return { settings: getDefaultSettings() };
  }

  return { settings: settingsDoc.data() };
});

/**
 * Actualizar configuración del sistema
 */
export const updateSettings = onCall(async (request) => {
  const { settings } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || authToken.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores pueden actualizar');
  }

  if (!settings) {
    throw new HttpsError('invalid-argument', 'Settings son requeridos');
  }

  await db.collection('system_settings').doc('main').set({
    ...settings,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: authToken.uid,
  }, { merge: true });

  return { success: true, message: 'Configuración guardada exitosamente' };
});


