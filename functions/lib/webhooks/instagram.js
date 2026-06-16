"use strict";
// Webhook Instagram Direct — alineado con apps/admin (integración + dueño + CRM)
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
exports.instagramWebhookPost = exports.instagramWebhookGet = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const crm_1 = require("@autodealers/crm");
const core_1 = require("@autodealers/core");
const messaging_1 = require("@autodealers/messaging");
const public_http_1 = require("./public-http");
const db = (0, firestore_1.getFirestore)();
exports.instagramWebhookGet = (0, https_1.onRequest)(public_http_1.publicWebhookHttpsOptions, async (req, res) => {
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
exports.instagramWebhookPost = (0, https_1.onRequest)(public_http_1.publicWebhookHttpsOptions, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    try {
        // Meta envía GET de verificación a la misma URL que POST: soportar ambos en el endpoint POST.
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
        const body = (req.body || {});
        const entry0 = (_a = body.entry) === null || _a === void 0 ? void 0 : _a[0];
        const instagramId = entry0 === null || entry0 === void 0 ? void 0 : entry0.id;
        if (!instagramId) {
            res.status(200).json({ received: true, error: 'No Instagram ID' });
            return;
        }
        let tenantId = null;
        let leadOwnerUserId;
        let igIntegrationData = null;
        const igIntSnap = await db
            .collectionGroup('integrations')
            .where('type', '==', 'instagram')
            .where('credentials.instagramId', '==', instagramId)
            .limit(1)
            .get();
        if (!igIntSnap.empty) {
            const igDoc = igIntSnap.docs[0];
            tenantId = (_c = (_b = igDoc.ref.parent.parent) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : null;
            igIntegrationData = igDoc.data();
            const lo = igIntegrationData === null || igIntegrationData === void 0 ? void 0 : igIntegrationData.leadOwnerUserId;
            if (typeof lo === 'string' && lo.trim()) {
                leadOwnerUserId = lo.trim();
            }
        }
        if (!tenantId) {
            const tenantsSnapshot = await db
                .collection('tenants')
                .where('settings.instagram.accountId', '==', instagramId)
                .limit(1)
                .get();
            if (!tenantsSnapshot.empty) {
                tenantId = tenantsSnapshot.docs[0].id;
            }
        }
        if (!tenantId) {
            const activeTenants = await db
                .collection('tenants')
                .where('status', '==', 'active')
                .limit(1)
                .get();
            if (!activeTenants.empty) {
                tenantId = activeTenants.docs[0].id;
                console.warn(`⚠️ Instagram ${instagramId}: tenant fallback ${tenantId}`);
            }
            else {
                res.status(200).json({ received: true, error: 'No tenant found' });
                return;
            }
        }
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        const tenantData = tenantDoc.data();
        const instagramConfig = (_d = tenantData === null || tenantData === void 0 ? void 0 : tenantData.settings) === null || _d === void 0 ? void 0 : _d.instagram;
        const creds = ((igIntegrationData === null || igIntegrationData === void 0 ? void 0 : igIntegrationData.credentials) || {});
        const intToken = creds.accessToken;
        const intPageId = creds.pageId;
        const intActive = (igIntegrationData === null || igIntegrationData === void 0 ? void 0 : igIntegrationData.status) === 'active' &&
            typeof intToken === 'string' &&
            intToken.length > 0 &&
            typeof intPageId === 'string' &&
            intPageId.length > 0;
        const tenantToken = typeof (instagramConfig === null || instagramConfig === void 0 ? void 0 : instagramConfig.accessToken) === 'string' ? instagramConfig.accessToken : undefined;
        const tenantPageId = typeof (instagramConfig === null || instagramConfig === void 0 ? void 0 : instagramConfig.pageId) === 'string' ? instagramConfig.pageId : undefined;
        const tenantEnabled = (instagramConfig === null || instagramConfig === void 0 ? void 0 : instagramConfig.enabled) === true;
        if (!intActive && (!tenantEnabled || !tenantToken || !tenantPageId)) {
            res.status(200).json({ received: true, error: 'Instagram not configured' });
            return;
        }
        const accessToken = intToken || tenantToken;
        const pageId = intPageId || tenantPageId;
        if (!accessToken || !pageId) {
            res.status(200).json({ received: true, error: 'Instagram credentials not found' });
            return;
        }
        const messaging = (_e = entry0 === null || entry0 === void 0 ? void 0 : entry0.messaging) === null || _e === void 0 ? void 0 : _e[0];
        if (!(messaging === null || messaging === void 0 ? void 0 : messaging.message)) {
            res.status(200).json({ received: true });
            return;
        }
        const messagePayload = {
            tenantId,
            channel: 'instagram',
            direction: 'inbound',
            from: ((_f = messaging.sender) === null || _f === void 0 ? void 0 : _f.id) || '',
            to: ((_g = messaging.recipient) === null || _g === void 0 ? void 0 : _g.id) || '',
            content: messaging.message.text || '',
            metadata: {
                messageId: messaging.message.mid,
                timestamp: messaging.timestamp,
                contactName: ((_h = messaging.sender) === null || _h === void 0 ? void 0 : _h.name) || 'Cliente Instagram',
            },
        };
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
            lead = await (0, crm_1.createLead)(tenantId, 'instagram', {
                name: messagePayload.metadata.contactName || 'Cliente Instagram',
                email: '',
                phone: messagePayload.from,
                preferredChannel: 'instagram',
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
                title: 'Nuevo Lead de Instagram',
                message: `${messagePayload.metadata.contactName || 'Cliente'} envió un mensaje`,
                channels: ['system'],
                metadata: { leadId: lead.id },
            });
        }
        const unifiedService = new messaging_1.UnifiedMessagingService();
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
                name: ((_j = leadData === null || leadData === void 0 ? void 0 : leadData.contact) === null || _j === void 0 ? void 0 : _j.name) || messagePayload.metadata.contactName || 'Cliente',
                phone: messagePayload.from,
                source: 'instagram',
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
                const autoResponse = await generateResponseWithTenantConfig(tenantId, `Lead de Instagram - ${((_k = leadData === null || leadData === void 0 ? void 0 : leadData.contact) === null || _k === void 0 ? void 0 : _k.name) || 'Cliente'}`, messagePayload.content, ((_l = leadData === null || leadData === void 0 ? void 0 : leadData.interactions) === null || _l === void 0 ? void 0 : _l.map((i) => i.content)) || []);
                if (autoResponse && !autoResponse.requiresApproval) {
                    const graphRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/messages`, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            recipient: { id: messagePayload.from },
                            message: { text: autoResponse.content },
                        }),
                    });
                    if (graphRes.ok) {
                        await db
                            .collection('tenants')
                            .doc(tenantId)
                            .collection('messages')
                            .add({
                            tenantId,
                            channel: 'instagram',
                            direction: 'outbound',
                            from: pageId,
                            to: messagePayload.from,
                            content: autoResponse.content,
                            metadata: {
                                autoGenerated: true,
                                leadId,
                                aiConfidence: autoResponse.confidence,
                            },
                            status: 'sent',
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                    }
                }
            }
        }
        catch (aiError) {
            console.warn('IA processing skipped:', aiError);
        }
        res.status(200).json({ received: true, leadId });
    }
    catch (error) {
        console.error('Instagram webhook error:', error);
        const message = error instanceof Error ? error.message : 'Webhook processing failed';
        res.status(400).json({ error: 'Webhook processing failed', details: message });
    }
});
//# sourceMappingURL=instagram.js.map