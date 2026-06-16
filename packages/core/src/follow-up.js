"use strict";
// Sistema de seguimiento de clientes sin compra
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
exports.createFollowUpCampaign = createFollowUpCampaign;
exports.runFollowUpCampaigns = runFollowUpCampaigns;
const shared_1 = require("@autodealers/shared");
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
const crm_1 = require("@autodealers/crm");
const promotions_1 = require("./promotions");
const messaging_1 = require("@autodealers/messaging");
const ai_1 = require("@autodealers/ai");
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
/**
 * Crea una campaña de seguimiento
 */
async function createFollowUpCampaign(campaign) {
    const docRef = getDb().collection('tenants')
        .doc(campaign.tenantId)
        .collection('follow_up_campaigns')
        .doc();
    await docRef.set({
        ...campaign,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        id: docRef.id,
        ...campaign,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Ejecuta campañas de seguimiento pendientes
 */
async function runFollowUpCampaigns() {
    const now = new Date();
    // Obtener todas las campañas activas que deben ejecutarse
    const tenantsSnapshot = await getDb().collection('tenants').get();
    for (const tenantDoc of tenantsSnapshot.docs) {
        const tenantId = tenantDoc.id;
        const campaignsSnapshot = await getDb().collection('tenants')
            .doc(tenantId)
            .collection('follow_up_campaigns')
            .where('isActive', '==', true)
            .where('nextRun', '<=', now)
            .get();
        for (const campaignDoc of campaignsSnapshot.docs) {
            const campaign = campaignDoc.data();
            try {
                await executeFollowUpCampaign(tenantId, campaign);
                // Calcular próxima ejecución
                const nextRun = calculateNextRun(campaign.frequency, now);
                await campaignDoc.ref.update({
                    lastRun: admin.firestore.FieldValue.serverTimestamp(),
                    nextRun,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            catch (error) {
                console.error(`Error executing campaign ${campaign.id}:`, error);
            }
        }
    }
}
/**
 * Ejecuta una campaña de seguimiento
 */
async function executeFollowUpCampaign(tenantId, campaign) {
    // Obtener leads objetivo
    const allLeads = await (0, crm_1.getLeads)(tenantId);
    const targetLeads = allLeads.filter((lead) => {
        // Filtrar por estado
        if (!campaign.targetLeads.status.includes(lead.status)) {
            return false;
        }
        // Filtrar por días desde último contacto
        const lastInteraction = lead.interactions[lead.interactions.length - 1];
        if (lastInteraction) {
            const daysSince = Math.floor((Date.now() - lastInteraction.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSince < campaign.targetLeads.daysSinceLastContact) {
                return false;
            }
        }
        return true;
    });
    // Obtener promociones activas si se usan
    let promotions = [];
    if (campaign.usePromotions) {
        promotions = await (0, promotions_1.getActivePromotions)(tenantId);
    }
    const unifiedService = new messaging_1.UnifiedMessagingService();
    const { getOpenAIApiKey } = await Promise.resolve().then(() => __importStar(require('./credentials')));
    const apiKey = await getOpenAIApiKey() || '';
    const aiAssistant = new ai_1.AIAssistant(apiKey);
    for (const lead of targetLeads) {
        try {
            // Generar mensaje personalizado
            let messageContent = campaign.customMessage || '';
            if (promotions.length > 0) {
                const promotion = promotions[0]; // Usar primera promoción activa
                const promotionText = `Tenemos una promoción especial: ${promotion.name}. ${promotion.description}`;
                messageContent = messageContent
                    ? `${messageContent}\n\n${promotionText}`
                    : promotionText;
            }
            // Mejorar mensaje con IA si está vacío
            if (!messageContent) {
                const aiResponse = await aiAssistant.generateResponse(`Genera un mensaje de seguimiento amigable para ${lead.contact.name} que no ha realizado una compra aún.`, 'Crea un mensaje que invite a ver nuestro inventario y ofrezca ayuda.', []);
                messageContent = aiResponse.content;
            }
            // Enviar mensaje
            await unifiedService.sendMessage({
                tenantId,
                leadId: lead.id,
                channel: lead.contact.preferredChannel || 'whatsapp',
                direction: 'outbound',
                from: '', // Se obtiene de configuración
                to: lead.contact.phone || lead.contact.email || '',
                content: messageContent,
                metadata: {
                    followUpCampaignId: campaign.id,
                    aiGenerated: !campaign.customMessage,
                },
            });
            // Agregar interacción al lead
            const { addInteraction } = await Promise.resolve().then(() => __importStar(require('@autodealers/crm')));
            await addInteraction(tenantId, lead.id, {
                type: 'message',
                content: `Seguimiento automático: ${messageContent}`,
                userId: 'system',
            });
        }
        catch (error) {
            console.error(`Error sending follow-up to lead ${lead.id}:`, error);
        }
    }
}
/**
 * Calcula próxima fecha de ejecución
 */
function calculateNextRun(frequency, from) {
    const next = new Date(from);
    switch (frequency) {
        case 'daily':
            next.setDate(next.getDate() + 1);
            break;
        case 'weekly':
            next.setDate(next.getDate() + 7);
            break;
        case 'biweekly':
            next.setDate(next.getDate() + 14);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + 1);
            break;
    }
    return next;
}
