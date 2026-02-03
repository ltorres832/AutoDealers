"use strict";
/**
 * Cloud Function: createPurchaseIntent
 *
 * Crea un Purchase Intent y valida la venta según las reglas del documento maestro.
 * Solo se puede crear si existe una interacción previa.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPurchaseIntent = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
/**
 * Verifica si existe una interacción previa válida
 */
async function validateInteraction(tenantId, clientId, vehicleId, dealerId, saleTimestamp) {
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
        const interaction = interactionDoc.data();
        const interactionTimestamp = interaction.timestamp;
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
    }
    catch (error) {
        console.error('Error validating interaction:', error);
        return { valid: false };
    }
}
/**
 * Sistema de detección de fraude
 */
async function performFraudCheck(tenantId, dealerId, clientId, vehicleId, interaction, saleTimestamp) {
    const flags = [];
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
            const clientCreatedAt = clientData === null || clientData === void 0 ? void 0 : clientData.createdAt;
            if (clientCreatedAt && clientCreatedAt.toMillis() > saleTimestamp.toMillis() - 3600000) {
                // Cliente creado menos de 1 hora antes de la venta
                flags.push('CLIENT_CREATED_RECENTLY');
                score += 25;
            }
        }
        // 2. Verificar IP del dealer vs IP del cliente (si está disponible)
        if (interaction === null || interaction === void 0 ? void 0 : interaction.ipAddress) {
            const dealerDoc = await db.collection('users').doc(dealerId).get();
            const dealerData = dealerDoc.data();
            // Comparar IPs si están disponibles
            if ((dealerData === null || dealerData === void 0 ? void 0 : dealerData.lastIpAddress) && interaction.ipAddress === dealerData.lastIpAddress) {
                flags.push('SAME_IP_DEALER_CLIENT');
                score += 30;
            }
        }
        // 3. Verificar interacciones creadas minutos antes de la venta
        if (interaction) {
            const timeDiff = saleTimestamp.toMillis() - interaction.timestamp.toMillis();
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
            const vehicleData = vehicleDoc.data();
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
    }
    catch (error) {
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
function generatePurchaseId() {
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
exports.createPurchaseIntent = functions.https.onCall(async (data, context) => {
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
        const vehicle = vehicleDoc.data();
        // Solo se puede crear purchase intent si el vehículo está en SOLD_PENDING_VERIFICATION
        if (vehicle.status !== 'SOLD_PENDING_VERIFICATION') {
            throw new functions.https.HttpsError('failed-precondition', `El vehículo debe estar en estado SOLD_PENDING_VERIFICATION. Estado actual: ${vehicle.status}`);
        }
        // 2. Validar interacción previa
        const interactionValidation = await validateInteraction(tenantId, clientId, vehicleId, dealerId, saleTs);
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
        const fraudCheck = await performFraudCheck(tenantId, dealerId, clientId, vehicleId, interactionValidation.interaction, saleTs);
        // 4. Crear Purchase Intent
        const purchaseIntentRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('purchase_intents')
            .doc();
        const purchaseId = generatePurchaseId();
        const purchaseIntent = {
            id: purchaseIntentRef.id,
            tenantId,
            dealerId,
            vehicleId,
            clientId,
            interactionId: interactionValidation.interactionId,
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
        }
        else {
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
    }
    catch (error) {
        console.error('Error creating purchase intent:', error);
        throw new functions.https.HttpsError('internal', `Error al crear purchase intent: ${error.message}`);
    }
});
//# sourceMappingURL=createPurchaseIntent.js.map