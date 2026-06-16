"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantBySubdomain = exports.validateSubdomain = exports.updateTenantSubdomain = exports.createTenantWithSubdomain = void 0;
// Cloud Functions para Subdominios
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// Crear tenant con subdominio
exports.createTenantWithSubdomain = (0, https_1.onCall)(async (request) => {
    const { name, type, subdomain, membershipId, companyName } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!name || !type) {
        throw new https_1.HttpsError('invalid-argument', 'name y type son requeridos');
    }
    try {
        // Validar subdominio si se proporciona
        if (subdomain) {
            const isValid = await validateSubdomainAvailability(subdomain);
            if (!isValid) {
                throw new https_1.HttpsError('already-exists', 'El subdominio ya está en uso');
            }
        }
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
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        if (type === 'dealer' && companyName) {
            tenantData.companyName = companyName;
        }
        const docRef = db.collection('tenants').doc();
        await docRef.set(tenantData);
        return Object.assign({ id: docRef.id }, tenantData);
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al crear tenant: ${error.message}`);
    }
});
// Actualizar subdominio de tenant
exports.updateTenantSubdomain = (0, https_1.onCall)(async (request) => {
    const { tenantId, subdomain } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !subdomain) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y subdomain son requeridos');
    }
    try {
        // Validar disponibilidad
        const isValid = await validateSubdomainAvailability(subdomain, tenantId);
        if (!isValid) {
            throw new https_1.HttpsError('already-exists', 'El subdominio ya está en uso');
        }
        await db.collection('tenants').doc(tenantId).update({
            subdomain,
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al actualizar subdominio: ${error.message}`);
    }
});
// Validar disponibilidad de subdominio
exports.validateSubdomain = (0, https_1.onCall)(async (request) => {
    const { subdomain, excludeTenantId } = request.data;
    if (!subdomain) {
        throw new https_1.HttpsError('invalid-argument', 'subdomain es requerido');
    }
    try {
        const isValid = await validateSubdomainAvailability(subdomain, excludeTenantId);
        return { available: isValid };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al validar subdominio: ${error.message}`);
    }
});
// Helper: Validar disponibilidad de subdominio
async function validateSubdomainAvailability(subdomain, excludeTenantId) {
    // Subdominios reservados
    const reservedSubdomains = ['admin', 'www', 'api', 'app', 'dealer', 'seller', 'advertiser'];
    if (reservedSubdomains.includes(subdomain.toLowerCase())) {
        return false;
    }
    // Validar formato (solo letras, números y guiones)
    if (!/^[a-z0-9-]+$/.test(subdomain.toLowerCase())) {
        return false;
    }
    // Verificar si ya existe
    let query = db.collection('tenants').where('subdomain', '==', subdomain.toLowerCase());
    const snapshot = await query.get();
    if (snapshot.empty) {
        return true; // Disponible
    }
    // Si hay resultados pero estamos excluyendo un tenantId, verificar
    if (excludeTenantId) {
        const existing = snapshot.docs.find((doc) => doc.id !== excludeTenantId);
        return !existing; // Disponible si no hay otros tenants con ese subdominio
    }
    return false; // No disponible
}
// Obtener tenant por subdominio
exports.getTenantBySubdomain = (0, https_1.onCall)(async (request) => {
    const { subdomain } = request.data;
    if (!subdomain) {
        throw new https_1.HttpsError('invalid-argument', 'subdomain es requerido');
    }
    try {
        const snapshot = await db
            .collection('tenants')
            .where('subdomain', '==', subdomain.toLowerCase())
            .where('status', '==', 'active')
            .limit(1)
            .get();
        if (snapshot.empty) {
            return { tenant: null };
        }
        const doc = snapshot.docs[0];
        const data = doc.data();
        return {
            tenant: Object.assign({ id: doc.id }, data),
        };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener tenant: ${error.message}`);
    }
});
//# sourceMappingURL=subdomains.js.map