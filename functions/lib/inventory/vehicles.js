"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markVehicleAsSold = exports.deleteVehicle = exports.updateVehicle = exports.createVehicle = exports.getVehicles = void 0;
// Cloud Functions para Inventory - Vehicles
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// Obtener vehículos del tenant
exports.getVehicles = (0, https_1.onCall)(async (request) => {
    const { tenantId, status, condition, make, model } = request.data;
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
            .collection('vehicles');
        if (status) {
            query = query.where('status', '==', status);
        }
        if (condition) {
            query = query.where('condition', '==', condition);
        }
        if (make) {
            query = query.where('make', '==', make);
        }
        if (model) {
            query = query.where('model', '==', model);
        }
        query = query.orderBy('createdAt', 'desc').limit(50);
        const snapshot = await query.get();
        const vehicles = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return { vehicles };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener vehículos: ${error.message}`);
    }
});
// Crear un nuevo vehículo
exports.createVehicle = (0, https_1.onCall)(async (request) => {
    const { tenantId, vehicle } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !vehicle) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y vehicle son requeridos');
    }
    try {
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('vehicles')
            .doc();
        await docRef.set(Object.assign(Object.assign({}, vehicle), { createdAt: new Date(), updatedAt: new Date() }));
        return { id: docRef.id };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear vehículo: ${error.message}`);
    }
});
// Actualizar un vehículo
exports.updateVehicle = (0, https_1.onCall)(async (request) => {
    const { tenantId, vehicleId, updates } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !vehicleId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, vehicleId y updates son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('vehicles')
            .doc(vehicleId)
            .update(Object.assign(Object.assign({}, updates), { updatedAt: new Date() }));
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al actualizar vehículo: ${error.message}`);
    }
});
// Eliminar un vehículo
exports.deleteVehicle = (0, https_1.onCall)(async (request) => {
    const { tenantId, vehicleId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !vehicleId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y vehicleId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('vehicles')
            .doc(vehicleId)
            .delete();
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al eliminar vehículo: ${error.message}`);
    }
});
// Marcar vehículo como vendido
exports.markVehicleAsSold = (0, https_1.onCall)(async (request) => {
    const { tenantId, vehicleId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !vehicleId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y vehicleId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('vehicles')
            .doc(vehicleId)
            .update({
            status: 'sold',
            soldAt: new Date(),
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al marcar vehículo como vendido: ${error.message}`);
    }
});
//# sourceMappingURL=vehicles.js.map