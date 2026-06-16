"use strict";
// Sistema de promociones y ofertas
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
exports.createPromotion = createPromotion;
exports.getActivePromotions = getActivePromotions;
exports.sendPromotionToLeads = sendPromotionToLeads;
exports.getPromotions = getPromotions;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
// Importación dinámica para evitar dependencias circulares
// import { getLeads } from '@autodealers/crm';
// import { createMessage } from '@autodealers/crm';
// import { UnifiedMessagingService } from '@autodealers/messaging';
// AIAssistant se importa dinámicamente cuando se necesita
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
/**
 * Crea una nueva promoción
 */
async function createPromotion(promotion) {
    const docRef = getDb()
        .collection('tenants')
        .doc(promotion.tenantId)
        .collection('promotions')
        .doc();
    await docRef.set({
        ...promotion,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        id: docRef.id,
        ...promotion,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Obtiene promociones activas
 */
async function getActivePromotions(tenantId) {
    const now = new Date();
    let snapshot;
    let promotions;
    try {
        // Intentar consulta con ambos filtros
        snapshot = await getDb()
            .collection('tenants')
            .doc(tenantId)
            .collection('promotions')
            .where('status', '==', 'active')
            .where('startDate', '<=', now)
            .get();
        promotions = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                startDate: data?.startDate?.toDate() || new Date(),
                endDate: data?.endDate?.toDate(),
                createdAt: data?.createdAt?.toDate() || new Date(),
                updatedAt: data?.updatedAt?.toDate() || new Date(),
            };
        });
    }
    catch (queryError) {
        // Si falla por falta de índice, usar fallback
        const isIndexError = queryError.code === 9 ||
            queryError.message?.includes('index') ||
            queryError.details?.includes('index') ||
            queryError.message?.includes('FAILED_PRECONDITION');
        if (isIndexError) {
            console.warn(`⚠️ Consulta de promociones falló por falta de índice para tenant ${tenantId}, usando fallback...`);
            try {
                // Fallback: solo filtrar por status, luego filtrar por fecha en memoria
                snapshot = await getDb()
                    .collection('tenants')
                    .doc(tenantId)
                    .collection('promotions')
                    .where('status', '==', 'active')
                    .get();
                promotions = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        startDate: data?.startDate?.toDate() || new Date(),
                        endDate: data?.endDate?.toDate(),
                        createdAt: data?.createdAt?.toDate() || new Date(),
                        updatedAt: data?.updatedAt?.toDate() || new Date(),
                    };
                });
                // Filtrar por startDate en memoria
                promotions = promotions.filter((promo) => promo.startDate <= now);
            }
            catch (fallbackError) {
                console.error(`❌ Fallback también falló para tenant ${tenantId}:`, fallbackError.message);
                promotions = [];
            }
        }
        else {
            // Si no es error de índice, lanzar el error original
            throw queryError;
        }
    }
    // Filtrar por endDate (siempre en memoria)
    return promotions.filter((promo) => !promo.endDate || promo.endDate >= now);
}
/**
 * Envía promoción a leads sin compra
 */
async function sendPromotionToLeads(tenantId, promotionId) {
    const promotionDoc = await getDb()
        .collection('tenants')
        .doc(tenantId)
        .collection('promotions')
        .doc(promotionId)
        .get();
    if (!promotionDoc.exists) {
        throw new Error('Promotion not found');
    }
    const promotion = promotionDoc.data();
    // Obtener leads sin compra (importación dinámica para evitar dependencias circulares)
    const { getLeads } = await Promise.resolve().then(() => __importStar(require('@autodealers/crm')));
    const leads = await getLeads(tenantId);
    const leadsWithoutSale = leads.filter((lead) => lead.status !== 'closed' && lead.status !== 'lost');
    const { UnifiedMessagingService } = await Promise.resolve().then(() => __importStar(require('@autodealers/messaging')));
    const unifiedService = new UnifiedMessagingService();
    const { getOpenAIApiKey } = await Promise.resolve().then(() => __importStar(require('./credentials')));
    const { AIAssistant } = await Promise.resolve().then(() => __importStar(require('@autodealers/ai')));
    const apiKey = await getOpenAIApiKey() || '';
    const aiAssistant = new AIAssistant(apiKey);
    for (const lead of leadsWithoutSale) {
        // Generar mensaje personalizado con IA
        const messageContent = await aiAssistant.generateResponse(`Promoción: ${promotion.name}. ${promotion.description}`, `Crea un mensaje atractivo para ofrecer esta promoción a ${lead.contact.name}`, []);
        // Enviar por canales configurados
        for (const channel of promotion.channels) {
            try {
                await unifiedService.sendMessage({
                    tenantId,
                    leadId: lead.id,
                    channel: channel,
                    direction: 'outbound',
                    from: '', // Se obtiene de la configuración
                    to: lead.contact.phone || lead.contact.email || '',
                    content: messageContent.content,
                    metadata: {
                        promotionId: promotionId,
                        aiGenerated: true,
                    },
                });
            }
            catch (error) {
                console.error(`Error sending promotion to ${lead.id}:`, error);
            }
        }
    }
}
/**
 * Obtiene promociones de un tenant
 */
async function getPromotions(tenantId, filters) {
    let query = getDb()
        .collection('tenants')
        .doc(tenantId)
        .collection('promotions');
    if (filters?.status) {
        query = query.where('status', '==', filters.status);
    }
    if (filters?.type) {
        query = query.where('type', '==', filters.type);
    }
    query = query.orderBy('createdAt', 'desc');
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            startDate: data?.startDate?.toDate() || new Date(),
            endDate: data?.endDate?.toDate(),
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
    });
}
