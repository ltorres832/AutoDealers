"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markVehicleAsSold = exports.deleteVehicle = exports.updateVehicle = exports.createVehicle = exports.getVehicles = void 0;
// Cloud Functions para Inventory - Vehicles
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
const VIN_FORMAT_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;
const VIN_TRANSLITERATION = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
    J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
    S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
function normalizeVin(vin) {
    return String(vin || '')
        .toUpperCase()
        .replace(/[\s\-]/g, '')
        .trim();
}
function isValidVinCheckDigit(vin) {
    if (!VIN_FORMAT_REGEX.test(vin))
        return false;
    let sum = 0;
    for (let i = 0; i < 17; i++) {
        const ch = vin[i];
        const value = /[0-9]/.test(ch) ? Number(ch) : VIN_TRANSLITERATION[ch];
        if (value === undefined)
            return false;
        sum += value * VIN_WEIGHTS[i];
    }
    const remainder = sum % 11;
    const check = remainder === 10 ? 'X' : String(remainder);
    return vin[8] === check;
}
function assertVinRequired(vehicle) {
    const top = typeof vehicle.vin === 'string' ? vehicle.vin : '';
    const specs = vehicle.specifications && typeof vehicle.specifications === 'object'
        ? vehicle.specifications.vin
        : undefined;
    const fromSpecs = typeof specs === 'string' ? specs : '';
    const vin = normalizeVin(top || fromSpecs);
    if (!vin) {
        throw new https_1.HttpsError('invalid-argument', 'El VIN es obligatorio');
    }
    if (!VIN_FORMAT_REGEX.test(vin) || !isValidVinCheckDigit(vin)) {
        throw new https_1.HttpsError('invalid-argument', 'VIN inválido. Debe tener 17 caracteres válidos.');
    }
    return vin;
}
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
        const requiredVin = assertVinRequired(vehicle);
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('vehicles')
            .doc();
        const specs = vehicle.specifications && typeof vehicle.specifications === 'object'
            ? Object.assign(Object.assign({}, vehicle.specifications), { vin: requiredVin }) : { vin: requiredVin };
        await docRef.set(Object.assign(Object.assign({}, vehicle), { vin: requiredVin, vinNormalized: requiredVin, specifications: specs, createdAt: new Date(), updatedAt: new Date() }));
        return { id: docRef.id };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al crear vehículo: ${error.message}`);
    }
});
// Actualizar un vehículo
exports.updateVehicle = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, vehicleId, updates } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !vehicleId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, vehicleId y updates son requeridos');
    }
    try {
        const ref = db.collection('tenants').doc(tenantId).collection('vehicles').doc(vehicleId);
        const existingSnap = await ref.get();
        const existing = existingSnap.exists ? (existingSnap.data() || {}) : {};
        const patch = Object.assign(Object.assign({}, updates), { updatedAt: new Date() });
        if (Object.prototype.hasOwnProperty.call(updates, 'vin')) {
            const nextRaw = normalizeVin(String((_a = updates.vin) !== null && _a !== void 0 ? _a : ''));
            const status = String(existing.status || '').toLowerCase();
            const isActive = existing.deleted !== true &&
                (status === 'available' ||
                    status === 'reserved' ||
                    (existing.publishedOnPublicPage === true && status !== 'sold' && status !== 'hidden'));
            if (!nextRaw) {
                if (isActive) {
                    throw new https_1.HttpsError('invalid-argument', 'No se puede quitar el VIN de un vehículo activo o publicado. El VIN es obligatorio');
                }
                patch.vin = null;
                patch.vinNormalized = '';
            }
            else {
                const requiredVin = assertVinRequired({ vin: nextRaw });
                patch.vin = requiredVin;
                patch.vinNormalized = requiredVin;
            }
        }
        const nextStatus = updates.status !== undefined
            ? String(updates.status || '').toLowerCase()
            : String(existing.status || '').toLowerCase();
        const prevStatus = String(existing.status || '').toLowerCase();
        const statusBecomingActive = updates.status !== undefined &&
            (nextStatus === 'available' || nextStatus === 'reserved') &&
            prevStatus !== 'available' &&
            prevStatus !== 'reserved';
        const publishing = updates.publishedOnPublicPage === true && existing.publishedOnPublicPage === false;
        if (statusBecomingActive || publishing) {
            assertVinRequired(Object.assign(Object.assign(Object.assign({}, existing), patch), { specifications: Object.assign(Object.assign({}, (existing.specifications || {})), (typeof patch.specifications === 'object' ? patch.specifications : {})) }));
        }
        await ref.update(patch);
        return { success: true };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
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
// Marcar vehículo como vendido (+ sync cross-tenant por VIN)
exports.markVehicleAsSold = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, vehicleId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !vehicleId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y vehicleId son requeridos');
    }
    try {
        const ref = db.collection('tenants').doc(tenantId).collection('vehicles').doc(vehicleId);
        const snap = await ref.get();
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'Vehículo no encontrado');
        }
        const data = snap.data() || {};
        const vinRaw = normalizeVin(String(data.vin || ((_a = data.specifications) === null || _a === void 0 ? void 0 : _a.vin) || ''));
        const now = new Date();
        await ref.update(Object.assign({ status: 'sold', showSoldBadge: true, soldAt: now, updatedAt: now, soldReason: 'mark_sold_callable' }, (vinRaw.length === 17 ? { vinNormalized: vinRaw, vin: vinRaw } : {})));
        // Sync cross-tenant por VIN (Admin SDK collection group)
        let synced = 0;
        if (VIN_FORMAT_REGEX.test(vinRaw)) {
            const sourcePath = `tenants/${tenantId}/vehicles/${vehicleId}`;
            const seen = new Set();
            const ingest = async (field) => {
                const q = await db.collectionGroup('vehicles').where(field, '==', vinRaw).get();
                for (const doc of q.docs) {
                    if (seen.has(doc.ref.path))
                        continue;
                    seen.add(doc.ref.path);
                    if (doc.ref.path === sourcePath)
                        continue;
                    const d = doc.data() || {};
                    if (String(d.status || '').toLowerCase() === 'sold' || d.soldAt)
                        continue;
                    if (d.soldSyncedFrom === sourcePath)
                        continue;
                    await doc.ref.update({
                        status: 'sold',
                        showSoldBadge: true,
                        showPublicSoldBadge: false,
                        publishedOnPublicPage: false,
                        soldAt: now,
                        deleted: false,
                        vinNormalized: vinRaw,
                        vin: vinRaw,
                        soldReason: 'vin_cross_tenant_sync',
                        soldSyncedFrom: sourcePath,
                        soldSyncedAt: now,
                        soldSyncedSourceTenantId: tenantId,
                        soldSyncedSourceVehicleId: vehicleId,
                        updatedAt: now,
                    });
                    synced++;
                }
            };
            try {
                await ingest('vinNormalized');
            }
            catch (e) {
                console.warn('markVehicleAsSold vinNormalized query:', e);
            }
            try {
                await ingest('vin');
            }
            catch (e) {
                console.warn('markVehicleAsSold vin query:', e);
            }
        }
        return { success: true, synced };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al marcar vehículo como vendido: ${error.message}`);
    }
});
//# sourceMappingURL=vehicles.js.map