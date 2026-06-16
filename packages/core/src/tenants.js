"use strict";
// Gestión de tenants (dealers/vendedores)
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
exports.createTenant = createTenant;
exports.getTenantById = getTenantById;
exports.getTenantBySubdomain = getTenantBySubdomain;
exports.getTenants = getTenants;
exports.updateTenant = updateTenant;
exports.getTenantByWhatsAppNumber = getTenantByWhatsAppNumber;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
/**
 * Crea un nuevo tenant
 */
async function createTenant(name, type, subdomain, membershipId, companyName) {
    const tenantData = {
        name,
        type,
        subdomain: subdomain || null,
        membershipId: membershipId || '',
        status: 'active',
        branding: {
            primaryColor: '#2563EB',
            secondaryColor: '#1E40AF',
        },
        settings: {},
    };
    // Solo agregar companyName si es dealer y tiene valor
    if (type === 'dealer' && companyName) {
        tenantData.companyName = companyName;
    }
    const docRef = getDb().collection('tenants').doc();
    await docRef.set({
        ...tenantData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        id: docRef.id,
        ...tenantData,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Obtiene un tenant por ID
 */
async function getTenantById(tenantId) {
    const tenantDoc = await getDb().collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
        return null;
    }
    const data = tenantDoc.data();
    return {
        id: tenantDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
}
/**
 * Obtiene un tenant por subdominio (solo activos)
 */
async function getTenantBySubdomain(subdomain) {
    const snapshot = await getDb().collection('tenants')
        .where('subdomain', '==', subdomain)
        .where('status', '==', 'active')
        .limit(1)
        .get();
    if (snapshot.empty) {
        return null;
    }
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
}
/**
 * Obtiene todos los tenants (solo para admin)
 */
async function getTenants() {
    const snapshot = await getDb().collection('tenants').get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
    });
}
/**
 * Actualiza un tenant
 */
async function updateTenant(tenantId, updates) {
    await getDb().collection('tenants').doc(tenantId).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Obtiene el tenantId por número de WhatsApp (busca en integraciones)
 */
async function getTenantByWhatsAppNumber(phoneNumberId) {
    try {
        // Buscar en la colección de integraciones
        const integrationsSnapshot = await getDb()
            .collectionGroup('integrations')
            .where('type', '==', 'whatsapp')
            .where('phoneNumberId', '==', phoneNumberId)
            .where('status', '==', 'active')
            .limit(1)
            .get();
        if (!integrationsSnapshot.empty) {
            const doc = integrationsSnapshot.docs[0];
            const integration = doc.data();
            const parentId = doc.ref.parent?.parent?.id;
            return (typeof integration.tenantId === 'string' && integration.tenantId) || parentId || null;
        }
        // Si no se encuentra, buscar en todos los tenants por settings
        const tenantsSnapshot = await getDb().collection('tenants').get();
        for (const tenantDoc of tenantsSnapshot.docs) {
            const tenantData = tenantDoc.data();
            const settings = tenantData?.settings || {};
            // Verificar si tiene WhatsApp configurado con este número
            if (settings.whatsapp?.phoneNumberId === phoneNumberId) {
                return tenantDoc.id;
            }
            // También buscar en subcolección de integraciones del tenant
            const tenantIntegrations = await getDb().collection('tenants')
                .doc(tenantDoc.id)
                .collection('integrations')
                .where('type', '==', 'whatsapp')
                .where('phoneNumberId', '==', phoneNumberId)
                .where('status', '==', 'active')
                .limit(1)
                .get();
            if (!tenantIntegrations.empty) {
                return tenantDoc.id;
            }
        }
        return null;
    }
    catch (error) {
        console.error('Error finding tenant by WhatsApp number:', error);
        return null;
    }
}
