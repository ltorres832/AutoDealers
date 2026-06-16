"use strict";
// Sistema de Mantenimiento de Plataforma
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
exports.getMaintenanceMode = getMaintenanceMode;
exports.isMaintenanceModeActive = isMaintenanceModeActive;
exports.updateMaintenanceMode = updateMaintenanceMode;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
/**
 * Obtiene el estado actual del modo de mantenimiento
 */
async function getMaintenanceMode() {
    const doc = await getDb().collection('system_settings').doc('maintenance_mode').get();
    if (!doc.exists) {
        return null;
    }
    const data = doc.data();
    return {
        enabled: data?.enabled || false,
        message: data?.message || 'La plataforma está en mantenimiento. Por favor, vuelve más tarde.',
        scheduledStart: data?.scheduledStart?.toDate(),
        scheduledEnd: data?.scheduledEnd?.toDate(),
        currentStart: data?.currentStart?.toDate(),
        currentEnd: data?.currentEnd?.toDate(),
        affectedDashboards: data?.affectedDashboards || [],
        createdAt: data?.createdAt?.toDate(),
        updatedAt: data?.updatedAt?.toDate(),
    };
}
/**
 * Verifica si el modo de mantenimiento está activo
 */
async function isMaintenanceModeActive() {
    const mode = await getMaintenanceMode();
    if (!mode || !mode.enabled) {
        return false;
    }
    // Verificar si hay una fecha de finalización y si ya pasó
    if (mode.currentEnd) {
        const now = new Date();
        if (now > mode.currentEnd) {
            // El mantenimiento ya terminó, desactivarlo automáticamente
            await updateMaintenanceMode({
                enabled: false,
                message: mode.message,
                affectedDashboards: mode.affectedDashboards,
            });
            return false;
        }
    }
    return true;
}
/**
 * Actualiza el modo de mantenimiento
 */
async function updateMaintenanceMode(mode) {
    const existing = await getMaintenanceMode();
    const updateData = {
        ...existing,
        ...mode,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Si se está activando, establecer currentStart
    if (mode.enabled && !existing?.enabled) {
        updateData.currentStart = admin.firestore.FieldValue.serverTimestamp();
    }
    // Si se está desactivando, limpiar currentStart y currentEnd
    if (mode.enabled === false && existing?.enabled) {
        updateData.currentStart = null;
        updateData.currentEnd = null;
    }
    // Si no existe, establecer createdAt
    if (!existing) {
        updateData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }
    await getDb().collection('system_settings').doc('maintenance_mode').set(updateData, { merge: true });
    return await getMaintenanceMode();
}
