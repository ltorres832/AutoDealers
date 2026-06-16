"use strict";
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
exports.getTenantSubscription = exports.getInvoices = exports.detachPaymentMethod = exports.setDefaultPaymentMethod = exports.getPaymentMethods = exports.createSetupIntent = exports.createPaymentIntent = exports.updateMembership = exports.getMembershipById = exports.getAvailableMemberships = exports.changeMembership = exports.reactivateSubscription = exports.cancelSubscription = exports.updateSubscription = exports.getAllSubscriptionsFunction = exports.getSubscription = exports.createSubscription = void 0;
// Cloud Functions para Billing/Subscriptions - COMPLETO
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const billing_1 = require("@autodealers/billing");
const billing_2 = require("@autodealers/billing");
const billing_3 = require("@autodealers/billing");
const db = (0, firestore_1.getFirestore)();
// Crear suscripción
exports.createSubscription = (0, https_1.onCall)(async (request) => {
    const { tenantId, userId, membershipId, customerEmail, customerName, priceId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !userId || !membershipId || !customerEmail || !customerName || !priceId) {
        throw new https_1.HttpsError('invalid-argument', 'Todos los campos son requeridos');
    }
    try {
        const stripeService = new billing_2.StripeService(process.env.STRIPE_SECRET_KEY || '');
        const subscriptionService = new billing_1.SubscriptionService(stripeService);
        const subscription = await subscriptionService.createSubscription(tenantId, userId, membershipId, customerEmail, customerName, priceId);
        return { subscription };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear suscripción: ${error.message}`);
    }
});
// Obtener suscripción
exports.getSubscription = (0, https_1.onCall)(async (request) => {
    const { subscriptionId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!subscriptionId) {
        throw new https_1.HttpsError('invalid-argument', 'subscriptionId es requerido');
    }
    try {
        const subscription = await (0, billing_3.getSubscriptionById)(subscriptionId);
        if (!subscription) {
            throw new https_1.HttpsError('not-found', 'Suscripción no encontrada');
        }
        return { subscription };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al obtener suscripción: ${error.message}`);
    }
});
// Obtener todas las suscripciones
exports.getAllSubscriptionsFunction = (0, https_1.onCall)(async (request) => {
    const { status, tenantId, membershipId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    try {
        const subscriptions = await (0, billing_3.getAllSubscriptions)({
            status,
            tenantId,
            membershipId,
        });
        return { subscriptions };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener suscripciones: ${error.message}`);
    }
});
// Actualizar suscripción
exports.updateSubscription = (0, https_1.onCall)(async (request) => {
    const { subscriptionId, updates } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!subscriptionId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'subscriptionId y updates son requeridos');
    }
    try {
        const stripeService = new billing_2.StripeService(process.env.STRIPE_SECRET_KEY || '');
        const subscriptionService = new billing_1.SubscriptionService(stripeService);
        await subscriptionService.updateSubscription(subscriptionId, updates);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al actualizar suscripción: ${error.message}`);
    }
});
// Cancelar suscripción
exports.cancelSubscription = (0, https_1.onCall)(async (request) => {
    const { subscriptionId, cancelAtPeriodEnd } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!subscriptionId) {
        throw new https_1.HttpsError('invalid-argument', 'subscriptionId es requerido');
    }
    try {
        const stripeService = new billing_2.StripeService(process.env.STRIPE_SECRET_KEY || '');
        const subscriptionService = new billing_1.SubscriptionService(stripeService);
        await subscriptionService.cancelSubscription(subscriptionId, cancelAtPeriodEnd !== false);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al cancelar suscripción: ${error.message}`);
    }
});
// Reactivar suscripción
exports.reactivateSubscription = (0, https_1.onCall)(async (request) => {
    const { subscriptionId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!subscriptionId) {
        throw new https_1.HttpsError('invalid-argument', 'subscriptionId es requerido');
    }
    try {
        const stripeService = new billing_2.StripeService(process.env.STRIPE_SECRET_KEY || '');
        const subscriptionService = new billing_1.SubscriptionService(stripeService);
        await subscriptionService.reactivateSubscription(subscriptionId);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al reactivar suscripción: ${error.message}`);
    }
});
// Cambiar membresía (upgrade/downgrade)
exports.changeMembership = (0, https_1.onCall)(async (request) => {
    const { subscriptionId, newMembershipId, newPriceId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!subscriptionId || !newMembershipId || !newPriceId) {
        throw new https_1.HttpsError('invalid-argument', 'subscriptionId, newMembershipId y newPriceId son requeridos');
    }
    try {
        const stripeService = new billing_2.StripeService(process.env.STRIPE_SECRET_KEY || '');
        const subscriptionService = new billing_1.SubscriptionService(stripeService);
        await subscriptionService.changeMembership(subscriptionId, newMembershipId, newPriceId);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al cambiar membresía: ${error.message}`);
    }
});
// Obtener membresías disponibles
exports.getAvailableMemberships = (0, https_1.onCall)(async (request) => {
    const { type } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    try {
        const { getMemberships } = await Promise.resolve().then(() => __importStar(require('@autodealers/billing')));
        const memberships = await getMemberships(type);
        return { memberships };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener membresías: ${error.message}`);
    }
});
// Obtener membresía por ID
exports.getMembershipById = (0, https_1.onCall)(async (request) => {
    const { membershipId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!membershipId) {
        throw new https_1.HttpsError('invalid-argument', 'membershipId es requerido');
    }
    try {
        const { getMembershipById: getMembership } = await Promise.resolve().then(() => __importStar(require('@autodealers/billing')));
        const membership = await getMembership(membershipId);
        if (!membership) {
            throw new https_1.HttpsError('not-found', 'Membresía no encontrada');
        }
        return { membership };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al obtener membresía: ${error.message}`);
    }
});
// Actualizar membresía (solo admin) - usado por Flutter Admin
exports.updateMembership = (0, https_1.onCall)(async (request) => {
    var _a;
    const { membershipId, updates } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    const role = (_a = auth.token) === null || _a === void 0 ? void 0 : _a.role;
    if (role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Solo administradores pueden actualizar membresías');
    }
    if (!membershipId || !updates || typeof updates !== 'object') {
        throw new https_1.HttpsError('invalid-argument', 'membershipId y updates son requeridos');
    }
    try {
        const { updateMembership: updateMembershipBilling, getMembershipById } = await Promise.resolve().then(() => __importStar(require('@autodealers/billing')));
        const { syncMembershipFeaturesToTenants } = await Promise.resolve().then(() => __importStar(require('@autodealers/core')));
        await updateMembershipBilling(membershipId, updates);
        await syncMembershipFeaturesToTenants(membershipId);
        const membership = await getMembershipById(membershipId);
        return { membership: membership !== null && membership !== void 0 ? membership : null };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al actualizar membresía: ${error.message}`);
    }
});
// Crear payment intent
exports.createPaymentIntent = (0, https_1.onCall)(async (request) => {
    const { tenantId, amount, currency, metadata } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !amount || !currency) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, amount y currency son requeridos');
    }
    try {
        const stripeService = new billing_2.StripeService(process.env.STRIPE_SECRET_KEY || '');
        const paymentIntent = await stripeService.createPaymentIntent(amount, currency, metadata);
        return { clientSecret: paymentIntent.client_secret, id: paymentIntent.id };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear payment intent: ${error.message}`);
    }
});
// Crear setup intent (para guardar método de pago)
exports.createSetupIntent = (0, https_1.onCall)(async (request) => {
    const { tenantId, customerId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        const stripeService = new billing_2.StripeService(process.env.STRIPE_SECRET_KEY || '');
        const setupIntent = await stripeService.createSetupIntent(customerId);
        return { clientSecret: setupIntent.client_secret, id: setupIntent.id };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear setup intent: ${error.message}`);
    }
});
// Obtener métodos de pago
exports.getPaymentMethods = (0, https_1.onCall)(async (request) => {
    const { customerId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!customerId) {
        throw new https_1.HttpsError('invalid-argument', 'customerId es requerido');
    }
    try {
        const stripeService = new billing_2.StripeService(process.env.STRIPE_SECRET_KEY || '');
        const paymentMethods = await stripeService.getPaymentMethods(customerId);
        return { paymentMethods };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener métodos de pago: ${error.message}`);
    }
});
// Establecer método de pago por defecto
exports.setDefaultPaymentMethod = (0, https_1.onCall)(async (request) => {
    const { customerId, paymentMethodId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!customerId || !paymentMethodId) {
        throw new https_1.HttpsError('invalid-argument', 'customerId y paymentMethodId son requeridos');
    }
    try {
        const stripeService = new billing_2.StripeService(process.env.STRIPE_SECRET_KEY || '');
        await stripeService.setDefaultPaymentMethod(customerId, paymentMethodId);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al establecer método de pago por defecto: ${error.message}`);
    }
});
// Desvincular método de pago
exports.detachPaymentMethod = (0, https_1.onCall)(async (request) => {
    const { paymentMethodId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!paymentMethodId) {
        throw new https_1.HttpsError('invalid-argument', 'paymentMethodId es requerido');
    }
    try {
        const stripeService = new billing_2.StripeService(process.env.STRIPE_SECRET_KEY || '');
        await stripeService.detachPaymentMethod(paymentMethodId);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al desvincular método de pago: ${error.message}`);
    }
});
// Obtener facturas
exports.getInvoices = (0, https_1.onCall)(async (request) => {
    const { customerId, limit } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!customerId) {
        throw new https_1.HttpsError('invalid-argument', 'customerId es requerido');
    }
    try {
        const stripeService = new billing_2.StripeService(process.env.STRIPE_SECRET_KEY || '');
        const invoices = await stripeService.getInvoices(customerId, limit || 10);
        return { invoices };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener facturas: ${error.message}`);
    }
});
// Obtener suscripción del tenant/usuario
exports.getTenantSubscription = (0, https_1.onCall)(async (request) => {
    const { tenantId, userId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        const subscriptions = await (0, billing_3.getAllSubscriptions)({
            tenantId,
            userId,
            status: 'active',
        });
        return { subscription: subscriptions.length > 0 ? subscriptions[0] : null };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener suscripción del tenant: ${error.message}`);
    }
});
//# sourceMappingURL=subscriptions.js.map