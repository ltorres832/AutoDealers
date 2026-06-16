"use strict";
// Sistema de respuestas automáticas
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
exports.createAutoResponse = createAutoResponse;
exports.getActiveAutoResponses = getActiveAutoResponses;
exports.findAutoResponse = findAutoResponse;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
/**
 * Crea una respuesta automática
 */
async function createAutoResponse(response) {
    const docRef = db
        .collection('tenants')
        .doc(response.tenantId)
        .collection('auto_responses')
        .doc();
    await docRef.set({
        ...response,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        id: docRef.id,
        ...response,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Obtiene respuestas automáticas activas
 */
async function getActiveAutoResponses(tenantId) {
    const snapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('auto_responses')
        .where('isActive', '==', true)
        .orderBy('priority', 'desc')
        .get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
    });
}
/**
 * Encuentra respuesta automática para un mensaje
 */
async function findAutoResponse(tenantId, message, channel) {
    const responses = await getActiveAutoResponses(tenantId);
    // Filtrar por canal
    const channelResponses = responses.filter((r) => r.channels.includes(channel));
    const messageLower = message.toLowerCase();
    // Buscar por prioridad
    for (const response of channelResponses) {
        if (response.trigger.type === 'always') {
            return response;
        }
        if (response.trigger.type === 'keyword' && response.trigger.keywords) {
            const hasKeyword = response.trigger.keywords.some((keyword) => messageLower.includes(keyword.toLowerCase()));
            if (hasKeyword) {
                return response;
            }
        }
        if (response.trigger.type === 'question' && response.trigger.question) {
            // Comparación simple (se puede mejorar con IA)
            if (messageLower.includes(response.trigger.question.toLowerCase()) ||
                response.trigger.question.toLowerCase().includes(messageLower)) {
                return response;
            }
        }
    }
    return null;
}
