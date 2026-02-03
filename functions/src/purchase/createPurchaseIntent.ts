/**
 * Cloud Function: createPurchaseIntent
 * 
 * Crea un Purchase Intent y valida la venta según las reglas del documento maestro.
 * Solo se puede crear si existe una interacción previa.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

interface PurchaseIntent {
  id: string;
  tenantId: string;
  dealerId: string;
  sellerId?: string;
  vehicleId: string;
  clientId: string;
  interactionId: string;
  status: 'pending' | 'verified' | 'rejected' | 'external';
  fraudScore: number;
  fraudFlags: string[];
  createdAt: Timestamp;
  verifiedAt?: Timestamp;
  purchaseId?: string;
}

interface Interaction {
  id: string;
  clientId: string;
  vehicleId: string;
  dealerId: string;
  type: 'chat' | 'lead' | 'reservation' | 'financing' | 'view';
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
}

interface Vehicle {
  id: string;
  status: 'AVAILABLE' | 'IN_NEGOTIATION' | 'SOLD_PENDING_VERIFICATION' | 'SOLD_VERIFIED' | 'SOLD_EXTERNAL';
  vin?: string;
}

interface FraudCheckResult {
  score: number;
  flags: string[];
  passed: boolean;
}

/**
 * Verifica si existe una interacción previa válida
 */
async function validateInteraction(
  tenantId: string,
  clientId: string,
  vehicleId: string,
  dealerId: string,
  saleTimestamp: Timestamp
): Promise<{ valid: boolean; interactionId?: string; interaction?: Interaction }> {
  try {
    // Buscar interacciones previas
    const interactionsSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('interactions')
      .where('clientId', '==', clientId)
      .where('vehicleId', '==', vehicleId)
      .where('dealerId', '==', dealerId)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (interactionsSnapshot.empty) {
      return { valid: false };
    }

    const interactionDoc = interactionsSnapshot.docs[0];
    const interaction = interactionDoc.data() as Interaction;
    const interactionTimestamp = interaction.timestamp as Timestamp;

    // La interacción debe ser anterior a la venta
    if (interactionTimestamp.toMillis() >= saleTimestamp.toMillis()) {
      return { valid: false };
    }

    // La interacción debe ser de al menos 1 minuto antes (evitar fraude)
    const timeDiff = saleTimestamp.toMillis() - interactionTimestamp.toMillis();
    if (timeDiff < 60000) { // 1 minuto
      return { valid: false };
    }

    return {
      valid: true,
      interactionId: interactionDoc.id,
      interaction,
    };
  } catch (error) {
    console.error('Error validating interaction:', error);
    return { valid: false };
  }
}

/**
 * Sistema de detección de fraude
 */
async function performFraudCheck(
  tenantId: string,
  dealerId: string,
  clientId: string,
  vehicleId: string,
  interaction: Interaction | undefined,
  saleTimestamp: Timestamp
): Promise<FraudCheckResult> {
  const flags: string[] = [];
  let score = 0;

  try {
    // 1. Verificar si el cliente fue creado después de marcar vendido
    const clientDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('leads')
      .doc(clientId)
      .get();

    if (clientDoc.exists) {
      const clientData = clientDoc.data();
      const clientCreatedAt = clientData?.createdAt as Timestamp;
      
      if (clientCreatedAt && clientCreatedAt.toMillis() > saleTimestamp.toMillis() - 3600000) {
        // Cliente creado menos de 1 hora antes de la venta
        flags.push('CLIENT_CREATED_RECENTLY');
        score += 25;
      }
    }

    // 2. Verificar IP del dealer vs IP del cliente (si está disponible)
    if (interaction?.ipAddress) {
      const dealerDoc = await db.collection('users').doc(dealerId).get();
      const dealerData = dealerDoc.data();
      
      // Comparar IPs si están disponibles
      if (dealerData?.lastIpAddress && interaction.ipAddress === dealerData.lastIpAddress) {
        flags.push('SAME_IP_DEALER_CLIENT');
        score += 30;
      }
    }

    // 3. Verificar interacciones creadas minutos antes de la venta
    if (interaction) {
      const timeDiff = saleTimestamp.toMillis() - (interaction.timestamp as Timestamp).toMillis();
      if (timeDiff < 300000) { // Menos de 5 minutos
        flags.push('INTERACTION_TOO_RECENT');
        score += 20;
      }
    }

    // 4. Verificar muchas ventas externas consecutivas del dealer
    const recentSalesSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('sales')
      .where('dealerId', '==', dealerId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    let externalSalesCount = 0;
    recentSalesSnapshot.docs.forEach((doc) => {
      const saleData = doc.data();
      if (saleData.status === 'external' || saleData.vehicleStatus === 'SOLD_EXTERNAL') {
        externalSalesCount++;
      }
    });

    if (externalSalesCount >= 5) {
      flags.push('TOO_MANY_EXTERNAL_SALES');
      score += 15;
    }

    // 5. Verificar VINs con patrones repetidos
    const vehicleDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('inventory')
      .doc(vehicleId)
      .get();

    if (vehicleDoc.exists) {
      const vehicleData = vehicleDoc.data() as Vehicle;
      if (vehicleData.vin) {
        // Buscar otros vehículos con VIN similar
        const similarVinsSnapshot = await db
          .collectionGroup('inventory')
          .where('vin', '==', vehicleData.vin)
          .get();

        if (similarVinsSnapshot.size > 1) {
          flags.push('DUPLICATE_VIN_PATTERN');
          score += 10;
        }
      }
    }

    // 6. Verificar si el cliente tiene múltiples ventas recientes
    const clientSalesSnapshot = await db
      .collectionGroup('sales')
      .where('clientId', '==', clientId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    if (clientSalesSnapshot.size > 2) {
      flags.push('CLIENT_MULTIPLE_SALES');
      score += 10;
    }

  } catch (error) {
    console.error('Error in fraud check:', error);
  }

  return {
    score: Math.min(score, 100), // Máximo 100
    flags,
    passed: score < 31, // Menos de 31 = normal
  };
}

/**
 * Genera un Purchase ID único
 */
function generatePurchaseId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `PUR-${timestamp}-${random}`.toUpperCase();
}

/**
 * Cloud Function: createPurchaseIntent
 * 
 * Se ejecuta cuando un dealer marca un vehículo como vendido.
 * Valida la venta y crea el Purchase Intent.
 */
export const createPurchaseIntent = functions.https.onCall(async (data, context) => {
  // Verificar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { tenantId, vehicleId, clientId, saleTimestamp } = data;

  if (!tenantId || !vehicleId || !clientId) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan parámetros requeridos');
  }

  const dealerId = context.auth.uid;
  const saleTs = saleTimestamp ? admin.firestore.Timestamp.fromMillis(saleTimestamp) : admin.firestore.Timestamp.now();

  try {
    // 1. Verificar que el vehículo existe y está en estado válido
    const vehicleDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('inventory')
      .doc(vehicleId)
      .get();

    if (!vehicleDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Vehículo no encontrado');
    }

    const vehicle = vehicleDoc.data() as Vehicle;
    
    // Solo se puede crear purchase intent si el vehículo está en SOLD_PENDING_VERIFICATION
    if (vehicle.status !== 'SOLD_PENDING_VERIFICATION') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `El vehículo debe estar en estado SOLD_PENDING_VERIFICATION. Estado actual: ${vehicle.status}`
      );
    }

    // 2. Validar interacción previa
    const interactionValidation = await validateInteraction(
      tenantId,
      clientId,
      vehicleId,
      dealerId,
      saleTs
    );

    if (!interactionValidation.valid) {
      // No hay interacción válida = venta externa
      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('inventory')
        .doc(vehicleId)
        .update({
          status: 'SOLD_EXTERNAL',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return {
        success: false,
        status: 'external',
        reason: 'No existe interacción previa válida',
        purchaseId: null,
      };
    }

    // 3. Realizar verificación antifraude
    const fraudCheck = await performFraudCheck(
      tenantId,
      dealerId,
      clientId,
      vehicleId,
      interactionValidation.interaction,
      saleTs
    );

    // 4. Crear Purchase Intent
    const purchaseIntentRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('purchase_intents')
      .doc();

    const purchaseId = generatePurchaseId();

    const purchaseIntent: PurchaseIntent = {
      id: purchaseIntentRef.id,
      tenantId,
      dealerId,
      vehicleId,
      clientId,
      interactionId: interactionValidation.interactionId!,
      status: fraudCheck.passed ? 'verified' : 'pending',
      fraudScore: fraudCheck.score,
      fraudFlags: fraudCheck.flags,
      createdAt: admin.firestore.Timestamp.now(),
      purchaseId: fraudCheck.passed ? purchaseId : undefined,
    };

    await purchaseIntentRef.set(purchaseIntent);

    // 5. Actualizar estado del vehículo
    if (fraudCheck.passed) {
      // Venta verificada
      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('inventory')
        .doc(vehicleId)
        .update({
          status: 'SOLD_VERIFIED',
          purchaseId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Actualizar Purchase Intent con fecha de verificación
      await purchaseIntentRef.update({
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Trigger para generar certificado (se implementará después)
      // await generateCertificate(tenantId, purchaseId, clientId, vehicleId, dealerId);

      return {
        success: true,
        status: 'verified',
        purchaseId,
        fraudScore: fraudCheck.score,
        fraudFlags: fraudCheck.flags,
      };
    } else {
      // Requiere revisión manual
      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('inventory')
        .doc(vehicleId)
        .update({
          status: 'SOLD_PENDING_VERIFICATION',
          fraudScore: fraudCheck.score,
          fraudFlags: fraudCheck.flags,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Notificar al admin (se implementará después)
      // await notifyAdminFraudAlert(tenantId, purchaseIntentRef.id, fraudCheck);

      return {
        success: false,
        status: 'pending_review',
        reason: 'Requiere revisión manual por alto score de fraude',
        fraudScore: fraudCheck.score,
        fraudFlags: fraudCheck.flags,
        purchaseId: null,
      };
    }
  } catch (error: any) {
    console.error('Error creating purchase intent:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Error al crear purchase intent: ${error.message}`
    );
  }
});


