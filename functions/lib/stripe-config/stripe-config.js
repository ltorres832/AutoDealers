"use strict";
// Cloud Functions para configuración completa de Stripe
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
exports.verifyStripeConnection = exports.updateStripeConfig = exports.getStripeConfig = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const db = (0, firestore_1.getFirestore)();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-11-20.acacia',
});
/**
 * Obtener configuración de Stripe
 */
exports.getStripeConfig = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Verificar que sea admin
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.data();
        if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Only admins can view Stripe config');
        }
        const configDoc = await db.collection('admin_config').doc('stripe').get();
        if (!configDoc.exists) {
            // Configuración por defecto
            const defaultConfig = {
                enabled: false,
                publicKey: '',
                secretKey: '', // No se retorna, solo se guarda
                webhookSecret: '', // No se retorna, solo se guarda
                currency: 'USD',
                taxRate: 0,
                paymentMethods: ['card'],
                subscriptionSettings: {
                    trialDays: 0,
                    gracePeriodDays: 7,
                    cancelAtPeriodEnd: true,
                },
                webhookUrl: '',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            await db.collection('admin_config').doc('stripe').set(defaultConfig);
            return {
                config: Object.assign(Object.assign({}, defaultConfig), { secretKey: '***', webhookSecret: '***' }),
            };
        }
        const config = configDoc.data();
        return {
            config: Object.assign(Object.assign({}, config), { secretKey: '***', webhookSecret: '***' }),
        };
    }
    catch (error) {
        console.error('Error getting Stripe config:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to get Stripe config: ${error.message}`);
    }
});
/**
 * Actualizar configuración de Stripe (solo admin)
 */
exports.updateStripeConfig = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Verificar que sea admin
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.data();
        if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Only admins can update Stripe config');
        }
        const { config } = request.data;
        if (!config) {
            throw new https_1.HttpsError('invalid-argument', 'Config is required');
        }
        // Validar configuración de Stripe si se proporciona
        if (config.secretKey && config.secretKey !== '***') {
            try {
                const testStripe = new stripe_1.default(config.secretKey, {
                    apiVersion: '2024-11-20.acacia',
                });
                // Intentar obtener cuenta para validar
                await testStripe.accounts.retrieve();
            }
            catch (stripeError) {
                throw new https_1.HttpsError('invalid-argument', `Invalid Stripe secret key: ${stripeError.message}`);
            }
        }
        // Actualizar configuración
        const updateData = Object.assign(Object.assign({}, config), { updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        // No actualizar si el valor es '***' (indicando que no se quiere cambiar)
        if (updateData.secretKey === '***') {
            delete updateData.secretKey;
        }
        if (updateData.webhookSecret === '***') {
            delete updateData.webhookSecret;
        }
        await db.collection('admin_config').doc('stripe').set(updateData, { merge: true });
        return { success: true, message: 'Stripe configuration updated successfully' };
    }
    catch (error) {
        console.error('Error updating Stripe config:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to update Stripe config: ${error.message}`);
    }
});
/**
 * Verificar conexión de Stripe
 */
exports.verifyStripeConnection = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Verificar que sea admin
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.data();
        if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Only admins can verify Stripe connection');
        }
        const configDoc = await db.collection('admin_config').doc('stripe').get();
        const config = configDoc.data();
        if (!(config === null || config === void 0 ? void 0 : config.secretKey) || config.secretKey === '***') {
            throw new https_1.HttpsError('invalid-argument', 'Stripe secret key not configured');
        }
        try {
            const testStripe = new stripe_1.default(config.secretKey, {
                apiVersion: '2024-11-20.acacia',
            });
            const account = await testStripe.accounts.retrieve();
            return {
                success: true,
                connected: true,
                account: {
                    id: account.id,
                    email: account.email,
                    country: account.country,
                    defaultCurrency: account.default_currency,
                },
            };
        }
        catch (stripeError) {
            return {
                success: false,
                connected: false,
                error: stripeError.message,
            };
        }
    }
    catch (error) {
        console.error('Error verifying Stripe connection:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to verify Stripe connection: ${error.message}`);
    }
});
//# sourceMappingURL=stripe-config.js.map