"use strict";
// Cloud Functions para Landing Page Configuration
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
exports.getPublicLandingConfig = exports.updateLandingConfig = exports.getLandingConfig = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const db = (0, firestore_1.getFirestore)();
/**
 * Obtener configuración de landing page
 */
exports.getLandingConfig = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        const { tenantId } = request.data;
        if (!tenantId) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID is required');
        }
        // Obtener configuración de landing del tenant
        const configDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('landing_config')
            .get();
        if (!configDoc.exists) {
            // Configuración por defecto
            const defaultConfig = {
                hero: {
                    title: 'Bienvenido a nuestro concesionario',
                    subtitle: 'Encuentra el vehículo perfecto para ti',
                    backgroundImage: '',
                    ctaText: 'Ver Inventario',
                    ctaLink: '/inventory',
                },
                sections: {
                    featuredVehicles: {
                        enabled: true,
                        title: 'Vehículos Destacados',
                        limit: 6,
                    },
                    about: {
                        enabled: true,
                        title: 'Sobre Nosotros',
                        content: '',
                    },
                    services: {
                        enabled: true,
                        title: 'Nuestros Servicios',
                        items: [],
                    },
                    testimonials: {
                        enabled: true,
                        title: 'Lo que dicen nuestros clientes',
                    },
                    contact: {
                        enabled: true,
                        title: 'Contáctanos',
                        formEnabled: true,
                    },
                },
                seo: {
                    title: '',
                    description: '',
                    keywords: [],
                },
                customCss: '',
                customJs: '',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            // Guardar configuración por defecto
            await db
                .collection('tenants')
                .doc(tenantId)
                .collection('settings')
                .doc('landing_config')
                .set(defaultConfig);
            return { config: defaultConfig };
        }
        const config = configDoc.data();
        return { config };
    }
    catch (error) {
        console.error('Error getting landing config:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to get landing config: ${error.message}`);
    }
});
/**
 * Actualizar configuración de landing page
 */
exports.updateLandingConfig = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId, config } = request.data;
        if (!tenantId || !config) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID and config are required');
        }
        // Verificar permisos
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.data();
        if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'admin' && (userData === null || userData === void 0 ? void 0 : userData.tenantId) !== tenantId) {
            throw new https_1.HttpsError('permission-denied', 'Only admins or tenant owners can update landing config');
        }
        // Actualizar configuración
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('landing_config')
            .set(Object.assign(Object.assign({}, config), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }), { merge: true });
        return { success: true, message: 'Landing configuration updated successfully' };
    }
    catch (error) {
        console.error('Error updating landing config:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to update landing config: ${error.message}`);
    }
});
/**
 * Obtener configuración pública de landing (sin autenticación)
 */
exports.getPublicLandingConfig = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        const { tenantId } = request.data;
        if (!tenantId) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID is required');
        }
        // Obtener configuración de landing del tenant
        const configDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('landing_config')
            .get();
        if (!configDoc.exists) {
            // Retornar configuración por defecto mínima
            return {
                config: {
                    hero: {
                        title: 'Bienvenido a nuestro concesionario',
                        subtitle: 'Encuentra el vehículo perfecto para ti',
                        backgroundImage: '',
                        ctaText: 'Ver Inventario',
                        ctaLink: '/inventory',
                    },
                    sections: {
                        featuredVehicles: { enabled: true },
                        about: { enabled: true },
                        services: { enabled: true },
                        testimonials: { enabled: true },
                        contact: { enabled: true },
                    },
                },
            };
        }
        const config = configDoc.data();
        // Remover campos sensibles como customCss y customJs si es necesario
        const publicConfig = Object.assign(Object.assign({}, config), { customCss: undefined, customJs: undefined });
        return { config: publicConfig };
    }
    catch (error) {
        console.error('Error getting public landing config:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to get public landing config: ${error.message}`);
    }
});
//# sourceMappingURL=landing-config.js.map