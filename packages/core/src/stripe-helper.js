"use strict";
// Helper para obtener instancias de Stripe usando credenciales desde Firestore
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
exports.getStripeInstance = getStripeInstance;
exports.getStripeWebhookSecretValue = getStripeWebhookSecretValue;
exports.getStripeAdvertiserWebhookSecretValue = getStripeAdvertiserWebhookSecretValue;
exports.getStripeService = getStripeService;
const stripe_1 = __importDefault(require("stripe"));
const credentials_1 = require("./credentials");
/**
 * Obtiene una instancia de Stripe usando las credenciales desde Firestore
 * Si no hay credenciales en Firestore, usa variables de entorno como fallback
 */
async function getStripeInstance() {
    const secretKey = await (0, credentials_1.getStripeSecretKey)();
    if (!secretKey) {
        throw new Error('Stripe Secret Key no está configurada. Configúrala en Admin → Configuración → General → Stripe');
    }
    return new stripe_1.default(secretKey, {
        apiVersion: '2023-10-16',
    });
}
/**
 * Obtiene el Webhook Secret de Stripe desde Firestore o variables de entorno
 */
async function getStripeWebhookSecretValue() {
    const secret = await (0, credentials_1.getStripeWebhookSecret)();
    if (!secret) {
        throw new Error('Stripe Webhook Secret no está configurado. Configúralo en Admin → Configuración → General → Stripe');
    }
    return secret;
}
/**
 * Webhook secret para `apps/advertiser` (URL distinta en Stripe).
 * Si no hay secreto dedicado, usa el mismo que {@link getStripeWebhookSecretValue}.
 */
async function getStripeAdvertiserWebhookSecretValue() {
    const secret = await (0, credentials_1.getStripeAdvertiserWebhookSecret)();
    if (!secret) {
        throw new Error('Stripe Webhook Secret no está configurado para advertiser. Configura stripeAdvertiserWebhookSecret (o STRIPE_ADVERTISER_WEBHOOK_SECRET), o el webhook principal compartido en Admin → Configuración → General → Stripe');
    }
    return secret;
}
/**
 * Crea una instancia de StripeService usando credenciales desde Firestore
 * Compatible con el paquete @autodealers/billing
 */
async function getStripeService() {
    const { StripeService } = await Promise.resolve().then(() => __importStar(require('@autodealers/billing')));
    const secretKey = await (0, credentials_1.getStripeSecretKey)();
    if (!secretKey) {
        throw new Error('Stripe Secret Key no está configurada. Configúrala en Admin → Configuración → General → Stripe');
    }
    return new StripeService(secretKey);
}
