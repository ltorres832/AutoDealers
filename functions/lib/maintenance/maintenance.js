"use strict";
// Cloud Functions para Maintenance Mode
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
exports.checkMaintenanceMode = exports.setMaintenanceMode = exports.getMaintenanceStatus = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const db = (0, firestore_1.getFirestore)();
/**
 * Obtener estado de mantenimiento
 */
exports.getMaintenanceStatus = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    var _a, _b;
    try {
        const maintenanceDoc = await db.collection('admin_config').doc('maintenance').get();
        if (!maintenanceDoc.exists) {
            // Por defecto, mantenimiento desactivado
            return {
                enabled: false,
                message: '',
                scheduledStart: null,
                scheduledEnd: null,
            };
        }
        const maintenanceData = maintenanceDoc.data();
        return {
            enabled: (maintenanceData === null || maintenanceData === void 0 ? void 0 : maintenanceData.enabled) || false,
            message: (maintenanceData === null || maintenanceData === void 0 ? void 0 : maintenanceData.message) || '',
            scheduledStart: ((_a = maintenanceData === null || maintenanceData === void 0 ? void 0 : maintenanceData.scheduledStart) === null || _a === void 0 ? void 0 : _a.toDate()) || null,
            scheduledEnd: ((_b = maintenanceData === null || maintenanceData === void 0 ? void 0 : maintenanceData.scheduledEnd) === null || _b === void 0 ? void 0 : _b.toDate()) || null,
            allowedIPs: (maintenanceData === null || maintenanceData === void 0 ? void 0 : maintenanceData.allowedIPs) || [],
            allowedUsers: (maintenanceData === null || maintenanceData === void 0 ? void 0 : maintenanceData.allowedUsers) || [],
        };
    }
    catch (error) {
        console.error('Error getting maintenance status:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to get maintenance status: ${error.message}`);
    }
});
/**
 * Activar/Desactivar modo de mantenimiento (solo admin)
 */
exports.setMaintenanceMode = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Verificar que sea admin
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.data();
        if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Only admins can set maintenance mode');
        }
        const { enabled, message, scheduledStart, scheduledEnd, allowedIPs, allowedUsers } = request.data;
        if (enabled === undefined) {
            throw new https_1.HttpsError('invalid-argument', 'Enabled status is required');
        }
        const maintenanceData = {
            enabled,
            message: message || '',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: request.auth.uid,
        };
        if (scheduledStart) {
            maintenanceData.scheduledStart = admin.firestore.Timestamp.fromDate(new Date(scheduledStart));
        }
        if (scheduledEnd) {
            maintenanceData.scheduledEnd = admin.firestore.Timestamp.fromDate(new Date(scheduledEnd));
        }
        if (allowedIPs && Array.isArray(allowedIPs)) {
            maintenanceData.allowedIPs = allowedIPs;
        }
        if (allowedUsers && Array.isArray(allowedUsers)) {
            maintenanceData.allowedUsers = allowedUsers;
        }
        await db.collection('admin_config').doc('maintenance').set(maintenanceData, { merge: true });
        return {
            success: true,
            message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`,
        };
    }
    catch (error) {
        console.error('Error setting maintenance mode:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to set maintenance mode: ${error.message}`);
    }
});
/**
 * Verificar si el sistema está en mantenimiento (público)
 */
exports.checkMaintenanceMode = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    var _a, _b, _c;
    try {
        const maintenanceDoc = await db.collection('admin_config').doc('maintenance').get();
        if (!maintenanceDoc.exists) {
            return { inMaintenance: false };
        }
        const maintenanceData = maintenanceDoc.data();
        const enabled = (maintenanceData === null || maintenanceData === void 0 ? void 0 : maintenanceData.enabled) || false;
        if (!enabled) {
            return { inMaintenance: false };
        }
        // Verificar si hay mantenimiento programado
        const now = new Date();
        const scheduledStart = (_a = maintenanceData === null || maintenanceData === void 0 ? void 0 : maintenanceData.scheduledStart) === null || _a === void 0 ? void 0 : _a.toDate();
        const scheduledEnd = (_b = maintenanceData === null || maintenanceData === void 0 ? void 0 : maintenanceData.scheduledEnd) === null || _b === void 0 ? void 0 : _b.toDate();
        if (scheduledStart && scheduledEnd) {
            if (now < scheduledStart || now > scheduledEnd) {
                return { inMaintenance: false };
            }
        }
        // Verificar IPs permitidas si se proporciona
        const clientIP = ((_c = request.rawRequest) === null || _c === void 0 ? void 0 : _c.ip) || '';
        const allowedIPs = (maintenanceData === null || maintenanceData === void 0 ? void 0 : maintenanceData.allowedIPs) || [];
        if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
            return {
                inMaintenance: true,
                message: (maintenanceData === null || maintenanceData === void 0 ? void 0 : maintenanceData.message) || 'El sistema está en mantenimiento',
            };
        }
        // Verificar usuarios permitidos si se proporciona
        if (request.auth) {
            const allowedUsers = (maintenanceData === null || maintenanceData === void 0 ? void 0 : maintenanceData.allowedUsers) || [];
            if (allowedUsers.length > 0 && allowedUsers.includes(request.auth.uid)) {
                return { inMaintenance: false };
            }
        }
        return {
            inMaintenance: true,
            message: (maintenanceData === null || maintenanceData === void 0 ? void 0 : maintenanceData.message) || 'El sistema está en mantenimiento',
        };
    }
    catch (error) {
        console.error('Error checking maintenance mode:', error);
        // En caso de error, no bloquear el acceso
        return { inMaintenance: false };
    }
});
//# sourceMappingURL=maintenance.js.map