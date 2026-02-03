"use strict";
// Gestión de suscripciones
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
exports.SubscriptionService = void 0;
const admin = __importStar(require("firebase-admin"));
class SubscriptionService {
    constructor(stripeService) {
        this.stripeService = stripeService;
    }
    /**
     * Crea una nueva suscripción
     */
    async createSubscription(tenantId, userId, membershipId, customerEmail, customerName, priceId) {
        // Crear cliente en Stripe
        const customer = await this.stripeService.createCustomer(customerEmail, customerName, {
            tenantId,
            userId,
            membershipId,
        });
        // Obtener o crear tax rate del 11.5%
        const taxRateId = await this.stripeService.getOrCreateTaxRate();
        // Crear suscripción con tax
        const stripeSubscription = await this.stripeService.createSubscription(customer.id, priceId, {
            tenantId,
            userId,
            membershipId,
        }, taxRateId);
        // Guardar en Firestore
        const { getFirestore } = await Promise.resolve().then(() => __importStar(require('@autodealers/core')));
        const db = getFirestore();
        const docRef = db.collection('subscriptions').doc();
        const subscription = {
            id: docRef.id,
            tenantId,
            userId,
            membershipId,
            stripeSubscriptionId: stripeSubscription.id,
            stripeCustomerId: customer.id,
            status: this.mapStripeStatus(stripeSubscription.status),
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end || false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // Guardar en Firestore
        await docRef.set({
            ...subscription,
            currentPeriodStart: admin.firestore.Timestamp.fromDate(subscription.currentPeriodStart),
            currentPeriodEnd: admin.firestore.Timestamp.fromDate(subscription.currentPeriodEnd),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return subscription;
    }
    /**
     * Actualiza el estado de una suscripción desde webhook
     */
    async updateSubscriptionFromWebhook(stripeSubscriptionId, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd) {
        // TODO: Actualizar en Firestore
        throw new Error('Not implemented');
    }
    /**
     * Cancela una suscripción
     */
    async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
        // Obtener subscriptionId de Stripe desde Firestore
        // TODO: Implementar
        const stripeSubscriptionId = '';
        await this.stripeService.cancelSubscription(stripeSubscriptionId, cancelAtPeriodEnd);
        // Actualizar en Firestore
        // TODO: Implementar
    }
    /**
     * Mapea el estado de Stripe al estado interno
     */
    mapStripeStatus(stripeStatus) {
        switch (stripeStatus) {
            case 'active':
                return 'active';
            case 'past_due':
            case 'unpaid':
                return 'past_due';
            case 'canceled':
            case 'incomplete_expired':
                return 'cancelled';
            default:
                return 'suspended';
        }
    }
    /**
     * Verifica si una suscripción está activa
     */
    isSubscriptionActive(subscription) {
        return (subscription.status === 'active' &&
            new Date() <= subscription.currentPeriodEnd);
    }
    /**
     * Obtiene días restantes de suscripción
     */
    getDaysRemaining(subscription) {
        const now = new Date();
        const end = subscription.currentPeriodEnd;
        const diff = end.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
}
exports.SubscriptionService = SubscriptionService;
//# sourceMappingURL=subscriptions.js.map