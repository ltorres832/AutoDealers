"use strict";
// Gestión de integraciones de redes sociales
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
exports.createSocialIntegration = createSocialIntegration;
exports.getSocialIntegrations = getSocialIntegrations;
exports.updateSocialIntegration = updateSocialIntegration;
exports.deactivateSocialIntegration = deactivateSocialIntegration;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
/**
 * Crea una integración de red social
 */
async function createSocialIntegration(integration) {
    const docRef = db
        .collection('tenants')
        .doc(integration.tenantId)
        .collection('integrations')
        .doc();
    await docRef.set({
        ...integration,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        id: docRef.id,
        ...integration,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Obtiene integraciones de un tenant
 */
async function getSocialIntegrations(tenantId, platform) {
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations');
    if (platform) {
        query = query.where('platform', '==', platform);
    }
    query = query.where('status', '==', 'active');
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            expiresAt: data?.expiresAt?.toDate(),
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
    });
}
/**
 * Actualiza una integración
 */
async function updateSocialIntegration(tenantId, integrationId, updates) {
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations')
        .doc(integrationId)
        .update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Desactiva una integración
 */
async function deactivateSocialIntegration(tenantId, integrationId) {
    await updateSocialIntegration(tenantId, integrationId, {
        status: 'inactive',
    });
}
