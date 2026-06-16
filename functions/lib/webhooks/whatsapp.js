"use strict";
// Webhook de WhatsApp Business API — alineado con apps/admin (CRM + dueño + verify)
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
exports.whatsappWebhookPost = exports.whatsappWebhookGet = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const crm_1 = require("@autodealers/crm");
const core_1 = require("@autodealers/core");
const messaging_1 = require("@autodealers/messaging");
const messaging_2 = require("@autodealers/messaging");
const public_http_1 = require("./public-http");
const db = (0, firestore_1.getFirestore)();
exports.whatsappWebhookGet = (0, https_1.onRequest)(public_http_1.publicWebhookHttpsOptions, async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const verifyToken = await (0, core_1.resolveMetaWebhookVerifyToken)();
    if (mode === 'subscribe' && token === verifyToken) {
        res.set('Content-Type', 'text/plain');
        res.status(200).send(challenge || '');
        return;
    }
    res.status(403).json({ error: 'Invalid token' });
});
exports.whatsappWebhookPost = (0, https_1.onRequest)(public_http_1.publicWebhookHttpsOptions, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    try {
        if (req.method === 'GET') {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];
            const verifyToken = await (0, core_1.resolveMetaWebhookVerifyToken)();
            if (mode === 'subscribe' && token === verifyToken) {
                res.set('Content-Type', 'text/plain');
                res.status(200).send(challenge || '');
                return;
            }
            res.status(403).json({ error: 'Invalid token' });
            return;
        }
        const body = req.body;
        const phoneNumberId = ((_f = (_e = (_d = (_c = (_b = (_a = body.entry) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.changes) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value) === null || _e === void 0 ? void 0 : _e.metadata) === null || _f === void 0 ? void 0 : _f.phone_number_id) || '';
        let tenantId = await (0, core_1.getTenantByWhatsAppNumber)(phoneNumberId || '');
        const integrationsSnapshot = await db
            .collectionGroup('integrations')
            .where('type', '==', 'whatsapp')
            .where('phoneNumberId', '==', phoneNumberId)
            .limit(1)
            .get();
        let leadOwnerUserId;
        let accessToken;
        let tenantPhoneNumberId;
        if (!integrationsSnapshot.empty) {
            const intDoc = integrationsSnapshot.docs[0];
            const integrationData = intDoc.data();
            if (!tenantId) {
                tenantId =
                    (typeof integrationData.tenantId === 'string' && integrationData.tenantId) ||
                        ((_g = intDoc.ref.parent.parent) === null || _g === void 0 ? void 0 : _g.id) ||
                        null;
            }
            const cred = integrationData.credentials || {};
            accessToken = (integrationData.accessToken ||
                cred.accessToken ||
                cred.longLivedUserToken);
            tenantPhoneNumberId = (integrationData.phoneNumberId ||
                cred.phoneNumberId ||
                cred.phone_number_id ||
                phoneNumberId);
            const lo = integrationData.leadOwnerUserId;
            if (typeof lo === 'string' && lo.trim()) {
                leadOwnerUserId = lo.trim();
            }
        }
        if (!tenantId) {
            const tenantsSnapshot = await db
                .collection('tenants')
                .where('status', '==', 'active')
                .limit(1)
                .get();
            if (!tenantsSnapshot.empty) {
                tenantId = tenantsSnapshot.docs[0].id;
                console.warn(`⚠️ WhatsApp ${phoneNumberId}: tenant fallback ${tenantId}`);
            }
            else {
                res.status(200).json({ received: true, error: 'No tenant found' });
                return;
            }
        }
        if (tenantId && (!accessToken || !tenantPhoneNumberId)) {
            const integrationDoc = await db
                .collection('tenants')
                .doc(tenantId)
                .collection('integrations')
                .where('type', '==', 'whatsapp')
                .where('status', '==', 'active')
                .limit(10)
                .get();
            const match = integrationDoc.docs.find((d) => {
                const data = d.data();
                const c = data.credentials || {};
                const pid = String(data.phoneNumberId || c.phoneNumberId || c.phone_number_id || '');
                return pid === String(phoneNumberId);
            });
            const doc = match || integrationDoc.docs[0];
            if (doc) {
                const integrationData = doc.data();
                const cred = integrationData.credentials || {};
                accessToken = (integrationData.accessToken ||
                    cred.accessToken ||
                    cred.longLivedUserToken);
                tenantPhoneNumberId = (integrationData.phoneNumberId ||
                    cred.phoneNumberId ||
                    cred.phone_number_id ||
                    phoneNumberId);
                if (!leadOwnerUserId) {
                    const lo = integrationData.leadOwnerUserId;
                    if (typeof lo === 'string' && lo.trim()) {
                        leadOwnerUserId = lo.trim();
                    }
                }
            }
        }
        if (!accessToken || !tenantPhoneNumberId) {
            const at = await (0, core_1.getWhatsAppAccessToken)(tenantId);
            const pid = await (0, core_1.getWhatsAppPhoneNumberId)(tenantId);
            if (at)
                accessToken = accessToken || at;
            if (pid)
                tenantPhoneNumberId = tenantPhoneNumberId || pid;
        }
        if (!accessToken || !tenantPhoneNumberId) {
            res.status(200).json({ received: true, error: 'WhatsApp credentials not found' });
            return;
        }
        const whatsappService = new messaging_1.WhatsAppService(accessToken, tenantPhoneNumberId);
        const messagePayload = await whatsappService.processWebhook(body);
        if (!tenantId && (messagePayload === null || messagePayload === void 0 ? void 0 : messagePayload.from)) {
            const existingLead = await (0, crm_1.findLeadByPhone)(messagePayload.from);
            if (existingLead) {
                tenantId = existingLead.tenantId;
            }
        }
        if (!messagePayload) {
            res.status(200).json({ received: true });
            return;
        }
        if (!tenantId) {
            res.status(200).json({ received: true, error: 'No tenant for message' });
            return;
        }
        messagePayload.tenantId = tenantId;
        let lead = await (0, crm_1.findLeadByPhoneInTenant)(tenantId, messagePayload.from);
        if (lead) {
            await (0, crm_1.addInteraction)(tenantId, lead.id, {
                type: 'message',
                content: messagePayload.content,
                userId: 'system',
            });
            await (0, crm_1.updateLead)(tenantId, lead.id, { updatedAt: new Date() });
            if (leadOwnerUserId && !lead.assignedTo) {
                await (0, crm_1.assignLead)(tenantId, lead.id, leadOwnerUserId);
            }
            messagePayload.leadId = lead.id;
        }
        else {
            lead = await (0, crm_1.createLead)(tenantId, 'whatsapp', {
                name: ((_h = messagePayload.metadata) === null || _h === void 0 ? void 0 : _h.contactName) || 'Cliente WhatsApp',
                email: '',
                phone: messagePayload.from,
                preferredChannel: 'whatsapp',
                city: '',
            }, `Mensaje inicial: ${messagePayload.content}`, {
                assignedTo: leadOwnerUserId,
                populateStandardContactFields: true,
                vehicleInterest: '',
            });
            messagePayload.leadId = lead.id;
            await (0, core_1.createNotification)({
                tenantId,
                userId: leadOwnerUserId || '',
                type: 'lead_created',
                title: 'Nuevo Lead de WhatsApp',
                message: `${((_j = messagePayload.metadata) === null || _j === void 0 ? void 0 : _j.contactName) || 'Cliente'} envió un mensaje`,
                channels: ['system'],
                metadata: { leadId: lead.id },
            });
        }
        const unifiedService = new messaging_2.UnifiedMessagingService(whatsappService);
        await unifiedService.sendMessage(messagePayload);
        const leadId = lead.id;
        try {
            const { classifyLeadWithTenantConfig, generateResponseWithTenantConfig } = await Promise.resolve().then(() => __importStar(require('@autodealers/ai')));
            const leadDoc = await db
                .collection('tenants')
                .doc(tenantId)
                .collection('leads')
                .doc(leadId)
                .get();
            const leadData = leadDoc.data();
            const classification = await classifyLeadWithTenantConfig(tenantId, {
                name: ((_k = leadData === null || leadData === void 0 ? void 0 : leadData.contact) === null || _k === void 0 ? void 0 : _k.name) || ((_l = messagePayload.metadata) === null || _l === void 0 ? void 0 : _l.contactName) || 'Cliente',
                phone: messagePayload.from,
                source: 'whatsapp',
                messages: [messagePayload.content],
            });
            if (classification) {
                await db
                    .collection('tenants')
                    .doc(tenantId)
                    .collection('leads')
                    .doc(leadId)
                    .update({
                    aiClassification: {
                        priority: classification.priority,
                        sentiment: classification.sentiment,
                        intent: classification.intent,
                        confidence: classification.confidence,
                        reasoning: classification.reasoning,
                    },
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            if ((leadData === null || leadData === void 0 ? void 0 : leadData.status) === 'new') {
                const autoResponse = await generateResponseWithTenantConfig(tenantId, `Lead de WhatsApp - ${((_m = leadData === null || leadData === void 0 ? void 0 : leadData.contact) === null || _m === void 0 ? void 0 : _m.name) || 'Cliente'}`, messagePayload.content, ((_o = leadData === null || leadData === void 0 ? void 0 : leadData.interactions) === null || _o === void 0 ? void 0 : _o.map((i) => i.content)) || []);
                if (autoResponse && !autoResponse.requiresApproval) {
                    await whatsappService.sendMessage({
                        tenantId,
                        channel: 'whatsapp',
                        direction: 'outbound',
                        from: tenantPhoneNumberId,
                        to: messagePayload.from,
                        content: autoResponse.content,
                        metadata: {
                            autoGenerated: true,
                            leadId,
                            aiConfidence: autoResponse.confidence,
                        },
                    });
                }
            }
        }
        catch (aiError) {
            console.warn('IA processing skipped:', aiError);
        }
        res.status(200).json({ received: true, leadId });
    }
    catch (error) {
        console.error('WhatsApp webhook error:', error);
        const message = error instanceof Error ? error.message : 'Webhook processing failed';
        res.status(400).json({ error: 'Webhook processing failed', details: message });
    }
});
//# sourceMappingURL=whatsapp.js.map