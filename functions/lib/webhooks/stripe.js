"use strict";
// Webhooks de Stripe - Manejo completo de eventos de pagos y suscripciones
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const public_http_1 = require("./public-http");
const core_1 = require("@autodealers/core");
const db = (0, firestore_1.getFirestore)();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-11-20.acacia',
});
/**
 * Webhook principal de Stripe.
 * Debe usar el cuerpo en bruto (rawBody); si se pasa JSON parseado, la firma de Stripe falla.
 */
exports.stripeWebhook = (0, https_1.onRequest)(public_http_1.publicWebhookHttpsOptions, async (req, res) => {
    const sigHeader = req.headers['stripe-signature'];
    const sig = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;
    let webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (!webhookSecret) {
        try {
            webhookSecret = (await (0, core_1.getStripeWebhookSecret)()) || '';
        }
        catch (_a) {
            /* Firestore no disponible en arranque */
        }
    }
    if (!(webhookSecret === null || webhookSecret === void 0 ? void 0 : webhookSecret.trim())) {
        res.status(500).json({
            error: 'Stripe webhook secret not configured',
            hint: 'Set STRIPE_WEBHOOK_SECRET on Functions or stripeWebhookSecret in Firestore',
        });
        return;
    }
    if (!sig) {
        res.status(400).json({ error: 'No signature' });
        return;
    }
    const rawBody = req.rawBody;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
        console.error('Stripe webhook: missing rawBody (Cloud Functions must preserve raw body)');
        res.status(400).json({ error: 'Invalid request body' });
        return;
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err);
        res.status(400).json({ error: `Webhook Error: ${err.message}` });
        return;
    }
    try {
        switch (event.type) {
            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;
            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;
            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        res.json({ received: true });
        return;
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
        return;
    }
});
/**
 * Maneja un pago exitoso
 */
async function handlePaymentSucceeded(invoice) {
    if (!invoice.subscription)
        return;
    const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription.id;
    // Obtener factura completa de Stripe con tax
    const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
        expand: ['customer', 'payment_intent'],
    });
    // Buscar suscripción en Firestore
    const subscriptionSnapshot = await db
        .collection('subscriptions')
        .where('stripeSubscriptionId', '==', subscriptionId)
        .limit(1)
        .get();
    if (subscriptionSnapshot.empty) {
        console.warn(`Subscription not found for Stripe subscription ${subscriptionId}`);
        return;
    }
    const subscriptionDoc = subscriptionSnapshot.docs[0];
    const subscriptionId_local = subscriptionDoc.id;
    const subscriptionData = subscriptionDoc.data();
    // Obtener información del usuario
    const userDoc = await db.collection('users').doc(subscriptionData.userId).get();
    const userData = userDoc.data();
    const customerName = (userData === null || userData === void 0 ? void 0 : userData.name) || 'Cliente';
    const customerEmail = (userData === null || userData === void 0 ? void 0 : userData.email) || (fullInvoice.customer_email || '');
    // Generar recibo
    const receipt = {
        receiptNumber: `REC-${Date.now()}`,
        invoiceId: fullInvoice.id,
        customerName,
        customerEmail,
        amount: fullInvoice.amount_paid / 100,
        currency: fullInvoice.currency.toUpperCase(),
        items: fullInvoice.lines.data.map((line) => ({
            description: line.description || 'Suscripción',
            amount: line.amount / 100,
            quantity: line.quantity || 1,
        })),
        tax: fullInvoice.tax ? fullInvoice.tax / 100 : 0,
        total: fullInvoice.amount_paid / 100,
        paidAt: new Date(fullInvoice.created * 1000),
    };
    // Guardar recibo en Firestore
    await db.collection('receipts').add(Object.assign(Object.assign({}, receipt), { subscriptionId: subscriptionId_local, tenantId: subscriptionData.tenantId, userId: subscriptionData.userId, createdAt: admin.firestore.FieldValue.serverTimestamp() }));
    // Enviar email con recibo (si hay servicio de email configurado)
    try {
        const { EmailService } = await Promise.resolve().then(() => __importStar(require('@autodealers/messaging')));
        const emailCreds = await getEmailCredentials();
        const emailApiKey = emailCreds.apiKey || '';
        const emailProvider = emailApiKey.includes('re_') || emailApiKey.startsWith('re_') ? 'resend' : 'sendgrid';
        if (emailApiKey) {
            const emailService = new EmailService(emailApiKey, emailProvider);
            await emailService.sendEmail({
                tenantId: subscriptionData.tenantId,
                channel: 'email',
                direction: 'outbound',
                from: emailCreds.fromAddress || 'noreply@autodealers.com',
                to: customerEmail,
                content: generateReceiptHTML(receipt),
                metadata: {
                    subject: `Recibo de Pago - ${receipt.receiptNumber}`,
                },
            });
        }
    }
    catch (emailError) {
        console.error('Error enviando email de recibo:', emailError);
    }
    // Actualizar estado y reactivar si estaba suspendida
    if (subscriptionData.status === 'suspended' || subscriptionData.status === 'past_due') {
        await reactivateAccountAfterPayment(subscriptionId_local);
    }
    else {
        // Actualizar fecha de último pago
        await db.collection('subscriptions').doc(subscriptionId_local).update({
            status: 'active',
            lastPaymentDate: admin.firestore.Timestamp.fromDate(new Date(invoice.created * 1000)),
            nextPaymentDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
            daysPastDue: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
}
/**
 * Maneja un pago fallido
 */
async function handlePaymentFailed(invoice) {
    if (!invoice.subscription)
        return;
    const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription.id;
    // Buscar suscripción
    const subscriptionSnapshot = await db
        .collection('subscriptions')
        .where('stripeSubscriptionId', '==', subscriptionId)
        .limit(1)
        .get();
    if (subscriptionSnapshot.empty)
        return;
    const subscriptionDoc = subscriptionSnapshot.docs[0];
    const subscriptionId_local = subscriptionDoc.id;
    // Actualizar estado a past_due
    await db.collection('subscriptions').doc(subscriptionId_local).update({
        status: 'past_due',
        daysPastDue: 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Enviar email de pago fallido
    const subscriptionData = subscriptionDoc.data();
    const userDoc = await db.collection('users').doc(subscriptionData.userId).get();
    const userData = userDoc.data();
    const customerEmail = (userData === null || userData === void 0 ? void 0 : userData.email) || '';
    if (customerEmail) {
        try {
            const { EmailService } = await Promise.resolve().then(() => __importStar(require('@autodealers/messaging')));
            const emailCreds = await getEmailCredentials();
            const emailApiKey = emailCreds.apiKey || '';
            const emailProvider = emailApiKey.includes('re_') || emailApiKey.startsWith('re_') ? 'resend' : 'sendgrid';
            if (emailApiKey) {
                const emailService = new EmailService(emailApiKey, emailProvider);
                await emailService.sendEmail({
                    tenantId: subscriptionData.tenantId,
                    channel: 'email',
                    direction: 'outbound',
                    from: emailCreds.fromAddress || 'noreply@autodealers.com',
                    to: customerEmail,
                    content: `
            <h2>Pago Fallido</h2>
            <p>Su pago de membresía no pudo ser procesado.</p>
            <p>Por favor, actualice su método de pago para continuar usando nuestros servicios.</p>
          `,
                    metadata: {
                        subject: 'Pago Fallido - AutoDealers',
                    },
                });
            }
        }
        catch (emailError) {
            console.error('Error enviando email de pago fallido:', emailError);
        }
    }
}
/**
 * Maneja creación de suscripción
 */
async function handleSubscriptionCreated(subscription) {
    const metadata = subscription.metadata;
    if (!(metadata === null || metadata === void 0 ? void 0 : metadata.tenantId) || !(metadata === null || metadata === void 0 ? void 0 : metadata.userId) || !(metadata === null || metadata === void 0 ? void 0 : metadata.membershipId)) {
        console.warn('Subscription created without required metadata:', subscription.id);
        return;
    }
    // Verificar si ya existe la suscripción
    const existingSubscription = await db
        .collection('subscriptions')
        .where('stripeSubscriptionId', '==', subscription.id)
        .limit(1)
        .get();
    if (!existingSubscription.empty) {
        console.log('Subscription already exists in Firestore:', subscription.id);
        return;
    }
    // Si viene del registro y está activa, activar cuenta y asignar membresía
    if (metadata.source === 'registration' && subscription.status === 'active') {
        await db.collection('users').doc(metadata.userId).update({
            membershipId: metadata.membershipId,
            status: 'active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await db.collection('tenants').doc(metadata.tenantId).update({
            membershipId: metadata.membershipId,
            status: 'active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    // Crear suscripción en Firestore
    const subscriptionData = {
        tenantId: metadata.tenantId,
        userId: metadata.userId,
        membershipId: metadata.membershipId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
        status: subscription.status === 'active' ? 'active' : subscription.status === 'trialing' ? 'trialing' : 'incomplete',
        currentPeriodStart: admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_start * 1000)),
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_end * 1000)),
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('subscriptions').add(subscriptionData);
    console.log('✅ Subscription created in Firestore:', subscription.id);
}
/**
 * Maneja actualización de suscripción
 */
async function handleSubscriptionUpdated(subscription) {
    var _a;
    const subscriptionSnapshot = await db
        .collection('subscriptions')
        .where('stripeSubscriptionId', '==', subscription.id)
        .limit(1)
        .get();
    if (subscriptionSnapshot.empty)
        return;
    const subscriptionDoc = subscriptionSnapshot.docs[0];
    const subscriptionId_local = subscriptionDoc.id;
    // Alinear con estados en Firestore / @autodealers/billing
    let status = 'active';
    switch (subscription.status) {
        case 'trialing':
            status = 'trialing';
            break;
        case 'active':
            status = 'active';
            break;
        case 'past_due':
            status = 'past_due';
            break;
        case 'unpaid':
            status = 'unpaid';
            break;
        case 'canceled':
            status = 'cancelled';
            break;
        case 'incomplete_expired':
            status = 'incomplete_expired';
            break;
        case 'incomplete':
            status = 'incomplete';
            break;
        case 'paused':
            status = 'suspended';
            break;
        default:
            status = 'active';
    }
    await db.collection('subscriptions').doc(subscriptionId_local).update(Object.assign(Object.assign({ status, currentPeriodStart: admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_start * 1000)), currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_end * 1000)), cancelAtPeriodEnd: subscription.cancel_at_period_end || false }, (typeof ((_a = subscription.metadata) === null || _a === void 0 ? void 0 : _a.membershipId) === 'string' &&
        subscription.metadata.membershipId.trim() !== ''
        ? { membershipId: subscription.metadata.membershipId.trim() }
        : {})), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
}
/**
 * Maneja eliminación de suscripción
 */
async function handleSubscriptionDeleted(subscription) {
    const subscriptionSnapshot = await db
        .collection('subscriptions')
        .where('stripeSubscriptionId', '==', subscription.id)
        .limit(1)
        .get();
    if (subscriptionSnapshot.empty)
        return;
    const subscriptionDoc = subscriptionSnapshot.docs[0];
    const subscriptionId_local = subscriptionDoc.id;
    await db.collection('subscriptions').doc(subscriptionId_local).update({
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Maneja pago completado de checkout
 */
async function handleCheckoutSessionCompleted(session) {
    const metadata = session.metadata;
    // Manejar registro de membresía
    if ((metadata === null || metadata === void 0 ? void 0 : metadata.source) === 'registration' && (metadata === null || metadata === void 0 ? void 0 : metadata.userId) && (metadata === null || metadata === void 0 ? void 0 : metadata.membershipId) && (metadata === null || metadata === void 0 ? void 0 : metadata.tenantId)) {
        try {
            let subscription = null;
            if (session.subscription) {
                subscription = await stripe.subscriptions.retrieve(typeof session.subscription === 'string' ? session.subscription : session.subscription.id, { expand: ['latest_invoice'] });
            }
            if (subscription) {
                await db.collection('users').doc(metadata.userId).update({
                    membershipId: metadata.membershipId,
                    status: 'active',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                await db.collection('tenants').doc(metadata.tenantId).update({
                    membershipId: metadata.membershipId,
                    status: 'active',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        catch (error) {
            console.error('Error procesando checkout de registro:', error);
        }
    }
}
// Helper functions
async function getEmailCredentials() {
    const configDoc = await db.collection('admin_config').doc('email').get();
    return configDoc.data() || { apiKey: '', fromAddress: '' };
}
function generateReceiptHTML(receipt) {
    return `
    <html>
      <body>
        <h2>Recibo de Pago</h2>
        <p>Número: ${receipt.receiptNumber}</p>
        <p>Fecha: ${receipt.paidAt.toLocaleDateString()}</p>
        <p>Total: ${receipt.currency} ${receipt.total}</p>
      </body>
    </html>
  `;
}
async function reactivateAccountAfterPayment(subscriptionId) {
    await db.collection('subscriptions').doc(subscriptionId).update({
        status: 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
//# sourceMappingURL=stripe.js.map