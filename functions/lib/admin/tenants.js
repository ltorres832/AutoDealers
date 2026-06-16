"use strict";
/**
 * Cloud Functions para Administración de Tenants (Admin)
 */
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
exports.updateTenantStatus = exports.updateTenant = exports.getTenantById = exports.getAllTenants = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Obtener todos los tenants (Admin only)
 */
exports.getAllTenants = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden acceder a esta función');
    }
    try {
        const tenantsSnapshot = await db.collection('tenants').get();
        const tenants = tenantsSnapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        // Obtener estadísticas adicionales para cada tenant
        const tenantsWithStats = await Promise.all(tenants.map(async (tenant) => {
            const [usersCount, vehiclesCount, leadsCount] = await Promise.all([
                db.collection('users').where('tenantId', '==', tenant.id).count().get(),
                db.collection('vehicles').where('tenantId', '==', tenant.id).count().get(),
                db.collection('tenants').doc(tenant.id).collection('leads').count().get(),
            ]);
            return Object.assign(Object.assign({}, tenant), { stats: {
                    users: usersCount.data().count,
                    vehicles: vehiclesCount.data().count,
                    leads: leadsCount.data().count,
                } });
        }));
        return { tenants: tenantsWithStats };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Error al obtener tenants', error.message);
    }
});
/**
 * Obtener tenant por ID (Admin only)
 */
exports.getTenantById = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden acceder a esta función');
    }
    const { tenantId } = data;
    if (!tenantId) {
        throw new functions.https.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Tenant no encontrado');
        }
        const [usersCount, vehiclesCount, leadsCount] = await Promise.all([
            db.collection('users').where('tenantId', '==', tenantId).count().get(),
            db.collection('vehicles').where('tenantId', '==', tenantId).count().get(),
            db.collection('tenants').doc(tenantId).collection('leads').count().get(),
        ]);
        return Object.assign(Object.assign({ id: tenantDoc.id }, tenantDoc.data()), { stats: {
                users: usersCount.data().count,
                vehicles: vehiclesCount.data().count,
                leads: leadsCount.data().count,
            } });
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Error al obtener tenant', error.message);
    }
});
/**
 * Actualizar tenant (Admin only)
 */
exports.updateTenant = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden acceder a esta función');
    }
    const { tenantId, updates } = data;
    if (!tenantId || !updates) {
        throw new functions.https.HttpsError('invalid-argument', 'tenantId y updates son requeridos');
    }
    try {
        await db.collection('tenants').doc(tenantId).update(Object.assign(Object.assign({}, updates), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
        return { success: true };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Error al actualizar tenant', error.message);
    }
});
/**
 * Cambiar estado de tenant (Admin only)
 */
exports.updateTenantStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden acceder a esta función');
    }
    const { tenantId, status } = data;
    if (!tenantId || !status) {
        throw new functions.https.HttpsError('invalid-argument', 'tenantId y status son requeridos');
    }
    try {
        await db.collection('tenants').doc(tenantId).update({
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Error al actualizar estado de tenant', error.message);
    }
});
//# sourceMappingURL=tenants.js.map