"use strict";
// Webhook de Facebook Messenger + Meta Lead Ads (leadgen)
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
exports.facebookWebhookPost = exports.facebookWebhookGet = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const crm_1 = require("@autodealers/crm");
const core_1 = require("@autodealers/core");
const messaging_1 = require("@autodealers/messaging");
const public_http_1 = require("./public-http");
const db = (0, firestore_1.getFirestore)();
/**
 * Webhook de Facebook - Verificación GET
 */
exports.facebookWebhookGet = (0, https_1.onRequest)(public_http_1.publicWebhookHttpsOptions, async (req, res) => {
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
/**
 * Webhook de Facebook - POST (Lead Ads + Messenger, alineado con apps/admin)
 */
exports.facebookWebhookPost = (0, https_1.onRequest)(public_http_1.publicWebhookHttpsOptions, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
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
        const body = (req.body || {});
        const entry0 = (_a = body.entry) === null || _a === void 0 ? void 0 : _a[0];
        const changes = entry0 === null || entry0 === void 0 ? void 0 : entry0.changes;
        const leadgenChange = Array.isArray(changes)
            ? changes.find((c) => c.field === 'leadgen')
            : undefined;
        if ((_b = leadgenChange === null || leadgenChange === void 0 ? void 0 : leadgenChange.value) === null || _b === void 0 ? void 0 : _b.leadgen_id) {
            const result = await (0, crm_1.ingestFacebookLeadgenWebhook)(body, db);
            if (result.ok) {
                res.status(200).json({
                    received: true,
                    leadId: result.leadId,
                    duplicate: result.duplicate || false,
                });
                return;
            }
            res.status(200).json({ received: true, error: result.error });
            return;
        }
        const pageId = entry0 === null || entry0 === void 0 ? void 0 : entry0.id;
        if (!pageId) {
            res.status(200).json({ received: true, error: 'No page ID' });
            return;
        }
        let tenantId = null;
        let leadOwnerUserId;
        let fbIntegrationData = null;
        const fbIntSnap = await db
            .collectionGroup('integrations')
            .where('type', '==', 'facebook')
            .where('credentials.pageId', '==', pageId)
            .limit(1)
            .get();
        if (!fbIntSnap.empty) {
            const fbDoc = fbIntSnap.docs[0];
            tenantId = (_d = (_c = fbDoc.ref.parent.parent) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : null;
            fbIntegrationData = fbDoc.data();
            const lo = fbIntegrationData === null || fbIntegrationData === void 0 ? void 0 : fbIntegrationData.leadOwnerUserId;
            if (typeof lo === 'string' && lo.trim()) {
                leadOwnerUserId = lo.trim();
            }
        }
        if (!tenantId) {
            const tenantsSnapshot = await db
                .collection('tenants')
                .where('settings.facebook.pageId', '==', pageId)
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
                console.warn(`⚠️ No se encontró tenant para Facebook page ${pageId}, usando fallback: ${tenantId}`);
            }
            else {
                res.status(200).json({ received: true, error: 'No tenant found' });
                return;
            }
        }
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        const tenantData = tenantDoc.data();
        const facebookConfig = (_e = tenantData === null || tenantData === void 0 ? void 0 : tenantData.settings) === null || _e === void 0 ? void 0 : _e.facebook;
        const creds = ((fbIntegrationData === null || fbIntegrationData === void 0 ? void 0 : fbIntegrationData.credentials) || {});
        const intToken = creds.accessToken;
        const intActive = (fbIntegrationData === null || fbIntegrationData === void 0 ? void 0 : fbIntegrationData.status) === 'active' &&
            typeof intToken === 'string' &&
            intToken.length > 0;
        const tenantToken = typeof (facebookConfig === null || facebookConfig === void 0 ? void 0 : facebookConfig.accessToken) === 'string' ? facebookConfig.accessToken : undefined;
        const tenantEnabled = (facebookConfig === null || facebookConfig === void 0 ? void 0 : facebookConfig.enabled) === true;
        if (!intActive && (!tenantEnabled || !tenantToken)) {
            res.status(200).json({ received: true, error: 'Facebook not configured' });
            return;
        }
        const accessToken = intToken || tenantToken;
        if (!accessToken) {
            res.status(200).json({ received: true, error: 'Facebook access token not found' });
            return;
        }
        const messaging = (_f = entry0 === null || entry0 === void 0 ? void 0 : entry0.messaging) === null || _f === void 0 ? void 0 : _f[0];
        if (!(messaging === null || messaging === void 0 ? void 0 : messaging.message)) {
            res.status(200).json({ received: true });
            return;
        }
        const facebookService = new messaging_1.FacebookMessengerService(accessToken, pageId);
        const messagePayload = await facebookService.processWebhook(req.body);
        if (!messagePayload) {
            res.status(200).json({ received: true });
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
            await (0, crm_1.updateLead)(tenantId, lead.id, {
                updatedAt: new Date(),
            });
            if (leadOwnerUserId && !lead.assignedTo) {
                await (0, crm_1.assignLead)(tenantId, lead.id, leadOwnerUserId);
            }
        }
        else {
            lead = await (0, crm_1.createLead)(tenantId, 'facebook', {
                name: ((_g = messagePayload.metadata) === null || _g === void 0 ? void 0 : _g.contactName) || 'Cliente Facebook',
                email: '',
                phone: messagePayload.from,
                preferredChannel: 'facebook',
                city: '',
            }, `Mensaje inicial: ${messagePayload.content}`, {
                assignedTo: leadOwnerUserId,
                populateStandardContactFields: true,
                vehicleInterest: '',
            });
            await (0, core_1.createNotification)({
                tenantId,
                userId: leadOwnerUserId || '',
                type: 'lead_created',
                title: 'Nuevo Lead de Facebook',
                message: `${((_h = messagePayload.metadata) === null || _h === void 0 ? void 0 : _h.contactName) || 'Cliente'} envió un mensaje`,
                channels: ['system'],
                metadata: { leadId: lead.id },
            });
        }
        const leadId = lead.id;
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('messages')
            .add(Object.assign(Object.assign({}, messagePayload), { leadId, status: 'received', createdAt: admin.firestore.FieldValue.serverTimestamp() }));
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
                name: ((_j = leadData === null || leadData === void 0 ? void 0 : leadData.contact) === null || _j === void 0 ? void 0 : _j.name) || ((_k = messagePayload.metadata) === null || _k === void 0 ? void 0 : _k.contactName) || 'Cliente',
                phone: messagePayload.from,
                source: 'facebook',
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
                const autoResponse = await generateResponseWithTenantConfig(tenantId, `Lead de Facebook - ${((_l = leadData === null || leadData === void 0 ? void 0 : leadData.contact) === null || _l === void 0 ? void 0 : _l.name) || 'Cliente'}`, messagePayload.content, ((_m = leadData === null || leadData === void 0 ? void 0 : leadData.interactions) === null || _m === void 0 ? void 0 : _m.map((i) => i.content)) || []);
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
                            channel: 'facebook',
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
        console.error('Facebook webhook error:', error);
        const message = error instanceof Error ? error.message : 'Webhook processing failed';
        res.status(400).json({
            error: 'Webhook processing failed',
            details: message,
        });
    }
});
//# sourceMappingURL=facebook.js.map