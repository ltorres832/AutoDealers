"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeSale = exports.createSale = exports.getSales = void 0;
// Cloud Functions para Sales
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// Obtener ventas del tenant
exports.getSales = (0, https_1.onCall)(async (request) => {
    const { tenantId, leadId, sellerId, vehicleId, status } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        let query = db
            .collection('tenants')
            .doc(tenantId)
            .collection('sales');
        if (leadId) {
            query = query.where('leadId', '==', leadId);
        }
        if (sellerId) {
            query = query.where('sellerId', '==', sellerId);
        }
        if (vehicleId) {
            query = query.where('vehicleId', '==', vehicleId);
        }
        if (status) {
            query = query.where('status', '==', status);
        }
        query = query.orderBy('createdAt', 'desc').limit(100);
        const snapshot = await query.get();
        const sales = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return { sales };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener ventas: ${error.message}`);
    }
});
// Crear venta
exports.createSale = (0, https_1.onCall)(async (request) => {
    const { tenantId, sale } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !sale) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y sale son requeridos');
    }
    try {
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('sales')
            .doc();
        await docRef.set(Object.assign(Object.assign({}, sale), { createdAt: new Date(), updatedAt: new Date() }));
        return { id: docRef.id };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear venta: ${error.message}`);
    }
});
// Completar venta
exports.completeSale = (0, https_1.onCall)(async (request) => {
    const { tenantId, saleId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !saleId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y saleId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('sales')
            .doc(saleId)
            .update({
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al completar venta: ${error.message}`);
    }
});
//# sourceMappingURL=sales.js.map