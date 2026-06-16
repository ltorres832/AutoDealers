"use strict";
/**
 * Cloud Functions para Administración de Sellers (Admin)
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
exports.updateSeller = exports.getSellerById = exports.getAllSellers = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/** Mismo shape que `count().get()` cuando no hay tenant (evita consultas inválidas). */
const emptyAggregateCount = { data: () => ({ count: 0 }) };
/**
 * Obtener todos los sellers (Admin only)
 */
exports.getAllSellers = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden acceder a esta función');
    }
    try {
        const sellersSnapshot = await db
            .collection('users')
            .where('role', '==', 'seller')
            .get();
        const sellers = await Promise.all(sellersSnapshot.docs.map(async (doc) => {
            const sellerData = doc.data();
            // Obtener estadísticas del seller
            const sellerTenantId = sellerData === null || sellerData === void 0 ? void 0 : sellerData.tenantId;
            const [leadsCount, salesCount, revenue] = await Promise.all([
                sellerTenantId
                    ? db
                        .collection('tenants')
                        .doc(sellerTenantId)
                        .collection('leads')
                        .where('assignedTo', '==', doc.id)
                        .count()
                        .get()
                    : Promise.resolve(emptyAggregateCount),
                sellerTenantId
                    ? db
                        .collection('tenants')
                        .doc(sellerTenantId)
                        .collection('sales')
                        .where('sellerId', '==', doc.id)
                        .count()
                        .get()
                    : Promise.resolve(emptyAggregateCount),
                sellerTenantId
                    ? db
                        .collection('tenants')
                        .doc(sellerTenantId)
                        .collection('sales')
                        .where('sellerId', '==', doc.id)
                        .where('status', '==', 'completed')
                        .get()
                        .then((snapshot) => {
                        return snapshot.docs.reduce((sum, saleDoc) => {
                            const sale = saleDoc.data();
                            return sum + (sale.totalAmount || 0);
                        }, 0);
                    })
                    : Promise.resolve(0),
            ]);
            return Object.assign(Object.assign({ id: doc.id }, sellerData), { stats: {
                    leads: leadsCount.data().count,
                    sales: salesCount.data().count,
                    revenue,
                } });
        }));
        return { sellers };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Error al obtener sellers', error.message);
    }
});
/**
 * Obtener seller por ID (Admin only)
 */
exports.getSellerById = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden acceder a esta función');
    }
    const { sellerId } = data;
    if (!sellerId) {
        throw new functions.https.HttpsError('invalid-argument', 'sellerId es requerido');
    }
    try {
        const sellerDoc = await db.collection('users').doc(sellerId).get();
        if (!sellerDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Seller no encontrado');
        }
        const sellerData = sellerDoc.data();
        if ((sellerData === null || sellerData === void 0 ? void 0 : sellerData.role) !== 'seller') {
            throw new functions.https.HttpsError('invalid-argument', 'El usuario no es un seller');
        }
        const sellerTenantId = sellerData === null || sellerData === void 0 ? void 0 : sellerData.tenantId;
        const [leadsCount, salesCount, revenue] = await Promise.all([
            sellerTenantId
                ? db
                    .collection('tenants')
                    .doc(sellerTenantId)
                    .collection('leads')
                    .where('assignedTo', '==', sellerId)
                    .count()
                    .get()
                : Promise.resolve(emptyAggregateCount),
            sellerTenantId
                ? db
                    .collection('tenants')
                    .doc(sellerTenantId)
                    .collection('sales')
                    .where('sellerId', '==', sellerId)
                    .count()
                    .get()
                : Promise.resolve(emptyAggregateCount),
            sellerTenantId
                ? db
                    .collection('tenants')
                    .doc(sellerTenantId)
                    .collection('sales')
                    .where('sellerId', '==', sellerId)
                    .where('status', '==', 'completed')
                    .get()
                    .then((snapshot) => {
                    return snapshot.docs.reduce((sum, saleDoc) => {
                        const sale = saleDoc.data();
                        return sum + (sale.totalAmount || 0);
                    }, 0);
                })
                : Promise.resolve(0),
        ]);
        return Object.assign(Object.assign({ id: sellerDoc.id }, sellerData), { stats: {
                leads: leadsCount.data().count,
                sales: salesCount.data().count,
                revenue,
            } });
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Error al obtener seller', error.message);
    }
});
/**
 * Actualizar seller (Admin only)
 */
exports.updateSeller = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden acceder a esta función');
    }
    const { sellerId, updates } = data;
    if (!sellerId || !updates) {
        throw new functions.https.HttpsError('invalid-argument', 'sellerId y updates son requeridos');
    }
    try {
        await db.collection('users').doc(sellerId).update(Object.assign(Object.assign({}, updates), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
        return { success: true };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Error al actualizar seller', error.message);
    }
});
//# sourceMappingURL=sellers.js.map