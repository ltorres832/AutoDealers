"use strict";
/**
 * Cloud Functions para Settings
 *
 * Funcionalidades:
 * - Obtener y actualizar configuración del sistema
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getSettings = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
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
exports.getSettings = (0, https_1.onCall)(async (request) => {
    var _a;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || authToken.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Solo administradores pueden acceder');
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
exports.updateSettings = (0, https_1.onCall)(async (request) => {
    var _a;
    const { settings } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || authToken.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Solo administradores pueden actualizar');
    }
    if (!settings) {
        throw new https_1.HttpsError('invalid-argument', 'Settings son requeridos');
    }
    await db.collection('system_settings').doc('main').set(Object.assign(Object.assign({}, settings), { updatedAt: firestore_1.FieldValue.serverTimestamp(), updatedBy: authToken.uid }), { merge: true });
    return { success: true, message: 'Configuración guardada exitosamente' };
});
//# sourceMappingURL=settings.js.map