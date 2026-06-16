"use strict";
// Cloud Functions para Pricing Config
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
exports.updatePricingConfig = exports.getPricingConfig = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const db = (0, firestore_1.getFirestore)();
/**
 * Obtener configuración de precios
 */
exports.getPricingConfig = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        const configDoc = await db.collection('admin_config').doc('pricing').get();
        if (!configDoc.exists) {
            // Valores por defecto
            const defaultConfig = {
                promotions: {
                    vehicle: {
                        durations: [3, 7, 15, 30],
                        prices: {
                            3: 9.99,
                            7: 19.99,
                            15: 34.99,
                            30: 59.99,
                        },
                    },
                    dealer: {
                        durations: [3, 7, 15, 30],
                        prices: {
                            3: 49.99,
                            7: 89.99,
                            15: 149.99,
                            30: 199.99,
                        },
                    },
                    seller: {
                        durations: [3, 7, 15, 30],
                        prices: {
                            3: 24.99,
                            7: 44.99,
                            15: 79.99,
                            30: 119.99,
                        },
                    },
                },
                banners: {
                    hero: {
                        durations: [7, 15, 30],
                        prices: {
                            7: 199,
                            15: 349,
                            30: 599,
                        },
                    },
                    sidebar: {
                        durations: [7, 15, 30],
                        prices: {
                            7: 99,
                            15: 149,
                            30: 299,
                        },
                    },
                    between_content: {
                        durations: [7, 15, 30],
                        prices: {
                            7: 149,
                            15: 249,
                            30: 449,
                        },
                    },
                    sponsors_section: {
                        durations: [7, 15, 30],
                        prices: {
                            7: 79,
                            15: 129,
                            30: 229,
                        },
                    },
                },
                limits: {
                    maxActivePromotions: 12,
                    maxActiveBanners: 4,
                    maxPromotionsPerUser: 5,
                    maxBannersPerUser: 2,
                    maxPromotionsPerDealer: 10,
                    maxPromotionsPerSeller: 3,
                    maxBannersPerDealer: 3,
                    maxBannersPerSeller: 1,
                    minPromotionDuration: 1,
                    maxPromotionDuration: 90,
                    minBannerDuration: 7,
                    maxBannerDuration: 90,
                },
                currency: 'USD',
                taxRate: 0,
                discounts: {
                    enabled: false,
                    volumeDiscounts: [],
                    membershipDiscounts: [],
                },
                restrictions: {
                    cooldownBetweenPromotions: 0,
                    cooldownBetweenBanners: 0,
                    requireApproval: false,
                },
            };
            // Crear configuración por defecto
            await db.collection('admin_config').doc('pricing').set(Object.assign(Object.assign({}, defaultConfig), { createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
            return { config: defaultConfig };
        }
        const config = configDoc.data();
        return { config };
    }
    catch (error) {
        console.error('Error getting pricing config:', error);
        throw new https_1.HttpsError('internal', `Failed to get pricing config: ${error.message}`);
    }
});
/**
 * Actualizar configuración de precios (solo admin)
 */
exports.updatePricingConfig = (0, https_1.onCall)({
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
            throw new https_1.HttpsError('permission-denied', 'Only admins can update pricing config');
        }
        const { config } = request.data;
        if (!config) {
            throw new https_1.HttpsError('invalid-argument', 'Config is required');
        }
        // Validar estructura
        if (!config.promotions || !config.banners || !config.limits) {
            throw new https_1.HttpsError('invalid-argument', 'Invalid config structure');
        }
        // Actualizar configuración
        await db.collection('admin_config').doc('pricing').set(Object.assign(Object.assign({}, config), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }), { merge: true });
        return { success: true, message: 'Configuración actualizada exitosamente' };
    }
    catch (error) {
        console.error('Error updating pricing config:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to update pricing config: ${error.message}`);
    }
});
//# sourceMappingURL=pricing-config.js.map