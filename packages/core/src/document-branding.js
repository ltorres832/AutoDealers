"use strict";
// Sistema de Configuración de Branding en Documentos
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
exports.getDocumentBrandingConfig = getDocumentBrandingConfig;
exports.setDocumentBrandingConfig = setDocumentBrandingConfig;
exports.getDocumentTypeBranding = getDocumentTypeBranding;
exports.getOrderedBrandingElements = getOrderedBrandingElements;
const shared_1 = require("@autodealers/shared");
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
/**
 * Obtiene la configuración de branding para un tenant/usuario
 */
async function getDocumentBrandingConfig(tenantId, userId) {
    // Primero intentar obtener configuración específica del usuario
    if (userId) {
        const userConfigDoc = await getDb().collection('document_branding')
            .where('tenantId', '==', tenantId)
            .where('userId', '==', userId)
            .limit(1)
            .get();
        if (!userConfigDoc.empty) {
            const data = userConfigDoc.docs[0].data();
            return {
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            };
        }
    }
    // Si no hay configuración de usuario, obtener la del tenant
    const tenantConfigDoc = await getDb().collection('document_branding')
        .where('tenantId', '==', tenantId)
        .where('userId', '==', null)
        .limit(1)
        .get();
    if (!tenantConfigDoc.empty) {
        const data = tenantConfigDoc.docs[0].data();
        return {
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        };
    }
    return null;
}
/**
 * Crea o actualiza la configuración de branding
 */
async function setDocumentBrandingConfig(config) {
    const { tenantId, userId } = config;
    // Buscar configuración existente
    let query = getDb().collection('document_branding')
        .where('tenantId', '==', tenantId);
    if (userId) {
        query = query.where('userId', '==', userId);
    }
    else {
        query = query.where('userId', '==', null);
    }
    const existing = await query.limit(1).get();
    const configData = {
        tenantId,
        userId: userId || null,
        showPlatformLogo: config.showPlatformLogo !== undefined ? config.showPlatformLogo : true,
        showDealerLogo: config.showDealerLogo !== undefined ? config.showDealerLogo : true,
        showSellerLogo: config.showSellerLogo !== undefined ? config.showSellerLogo : false,
        showPlatformName: config.showPlatformName !== undefined ? config.showPlatformName : true,
        showDealerName: config.showDealerName !== undefined ? config.showDealerName : true,
        showSellerName: config.showSellerName !== undefined ? config.showSellerName : false,
        logoOrder: config.logoOrder || {
            platform: 1,
            dealer: 2,
            seller: 3,
        },
        nameOrder: config.nameOrder || {
            platform: 1,
            dealer: 2,
            seller: 3,
        },
        platformLogoUrl: config.platformLogoUrl,
        dealerLogoUrl: config.dealerLogoUrl,
        sellerLogoUrl: config.sellerLogoUrl,
        platformName: config.platformName,
        dealerName: config.dealerName,
        sellerName: config.sellerName,
        documentTypes: config.documentTypes || {},
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (existing.empty) {
        configData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        const docRef = getDb().collection('document_branding').doc();
        await docRef.set(configData);
        return {
            ...configData,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    else {
        const docRef = existing.docs[0].ref;
        await docRef.update(configData);
        const updated = await docRef.get();
        return {
            ...updated.data(),
            createdAt: updated.data()?.createdAt?.toDate() || new Date(),
            updatedAt: updated.data()?.updatedAt?.toDate() || new Date(),
        };
    }
}
/**
 * Obtiene la configuración efectiva para un tipo de documento específico
 */
async function getDocumentTypeBranding(tenantId, documentType, userId) {
    const config = await getDocumentBrandingConfig(tenantId, userId);
    if (!config) {
        // Configuración por defecto
        return {
            showPlatformLogo: true,
            showDealerLogo: true,
            showSellerLogo: false,
            showPlatformName: true,
            showDealerName: true,
            showSellerName: false,
        };
    }
    // Si hay configuración específica para este tipo de documento, usarla
    const documentTypeConfig = config.documentTypes[documentType];
    if (documentTypeConfig) {
        return {
            showPlatformLogo: documentTypeConfig.showPlatformLogo !== undefined
                ? documentTypeConfig.showPlatformLogo
                : config.showPlatformLogo,
            showDealerLogo: documentTypeConfig.showDealerLogo !== undefined
                ? documentTypeConfig.showDealerLogo
                : config.showDealerLogo,
            showSellerLogo: documentTypeConfig.showSellerLogo !== undefined
                ? documentTypeConfig.showSellerLogo
                : config.showSellerLogo,
            showPlatformName: documentTypeConfig.showPlatformName !== undefined
                ? documentTypeConfig.showPlatformName
                : config.showPlatformName,
            showDealerName: documentTypeConfig.showDealerName !== undefined
                ? documentTypeConfig.showDealerName
                : config.showDealerName,
            showSellerName: documentTypeConfig.showSellerName !== undefined
                ? documentTypeConfig.showSellerName
                : config.showSellerName,
            logoOrder: documentTypeConfig.logoOrder || config.logoOrder,
            nameOrder: documentTypeConfig.nameOrder || config.nameOrder,
        };
    }
    // Usar configuración general
    return {
        showPlatformLogo: config.showPlatformLogo,
        showDealerLogo: config.showDealerLogo,
        showSellerLogo: config.showSellerLogo,
        showPlatformName: config.showPlatformName,
        showDealerName: config.showDealerName,
        showSellerName: config.showSellerName,
        logoOrder: config.logoOrder,
        nameOrder: config.nameOrder,
    };
}
/**
 * Obtiene los logos y nombres ordenados según la configuración
 */
async function getOrderedBrandingElements(tenantId, documentType, userId) {
    const config = await getDocumentBrandingConfig(tenantId, userId);
    const typeConfig = await getDocumentTypeBranding(tenantId, documentType, userId);
    if (!config) {
        return { logos: [], names: [] };
    }
    // Obtener información del tenant y usuario
    const tenantDoc = await getDb().collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.exists ? tenantDoc.data() : null;
    let userData = null;
    if (userId) {
        const userDoc = await getDb().collection('users').doc(userId).get();
        userData = userDoc.exists ? userDoc.data() : null;
    }
    // Construir array de logos
    const logos = [];
    if (typeConfig.showPlatformLogo) {
        logos.push({
            type: 'platform',
            url: config.platformLogoUrl,
            name: config.platformName || 'AutoDealers',
        });
    }
    if (typeConfig.showDealerLogo && tenantData) {
        logos.push({
            type: 'dealer',
            url: config.dealerLogoUrl || tenantData.logoUrl,
            name: config.dealerName || tenantData.name || tenantData.companyName,
        });
    }
    if (typeConfig.showSellerLogo && userData) {
        logos.push({
            type: 'seller',
            url: config.sellerLogoUrl,
            name: config.sellerName || userData.name,
        });
    }
    // Ordenar logos según logoOrder
    const logoOrder = typeConfig.logoOrder || config.logoOrder;
    logos.sort((a, b) => {
        const orderA = logoOrder[a.type] || 999;
        const orderB = logoOrder[b.type] || 999;
        return orderA - orderB;
    });
    // Construir array de nombres
    const names = [];
    if (typeConfig.showPlatformName) {
        names.push({
            type: 'platform',
            text: config.platformName || 'AutoDealers',
        });
    }
    if (typeConfig.showDealerName && tenantData) {
        names.push({
            type: 'dealer',
            text: config.dealerName || tenantData.name || tenantData.companyName || '',
        });
    }
    if (typeConfig.showSellerName && userData) {
        names.push({
            type: 'seller',
            text: config.sellerName || userData.name || '',
        });
    }
    // Ordenar nombres según nameOrder
    const nameOrder = typeConfig.nameOrder || config.nameOrder;
    names.sort((a, b) => {
        const orderA = nameOrder[a.type] || 999;
        const orderB = nameOrder[b.type] || 999;
        return orderA - orderB;
    });
    return { logos, names };
}
