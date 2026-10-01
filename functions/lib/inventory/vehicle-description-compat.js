"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileVehicleDescription = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const vehicle_description_legacy_1 = require("./description-runtime/vehicle-description-legacy");
exports.reconcileVehicleDescription = (0, firestore_1.onDocumentWrittenWithAuthContext)({
    document: 'tenants/{tenantId}/vehicles/{vehicleId}', region: 'us-central1', retry: true,
}, async (event) => {
    if (!event.data)
        return;
    // The Functions runtime may have a named admin app but no default app.
    const app = (0, app_1.getApps)().find(candidate => candidate.name === '[DEFAULT]') || (0, app_1.initializeApp)();
    const database = (0, firestore_2.getFirestore)(app);
    try {
        await (0, vehicle_description_legacy_1.reconcileLegacyVehicleDescription)(database, { ...event.data, authId: event.authId, authType: event.authType });
    }
    catch (error) {
        if (error?.status >= 400 && error?.status < 500) {
            await database.collection('tenants').doc(event.params.tenantId).collection('vehicle_description_audit').add({ action: 'legacy_reconciliation', status: 'error', errorCode: error.code || 'invalid_data', vehicleId: event.params.vehicleId, userId: event.authId || null, createdAt: new Date().toISOString() });
            return;
        }
        throw error;
    }
});
