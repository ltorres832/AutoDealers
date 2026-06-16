"use strict";
// Sistema de sincronización automática de features (mantener alineado con feature-sync.ts)
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
exports.syncMembershipFeaturesToTenants = syncMembershipFeaturesToTenants;
exports.getTenantFeaturesCached = getTenantFeaturesCached;
exports.setupMembershipSyncListener = setupMembershipSyncListener;
const firebase_1 = require("./firebase");
const admin = __importStar(require("firebase-admin"));
function getDb() {
    return (0, firebase_1.getFirestore)();
}
async function readMembershipFeaturesFromDb(membershipId) {
    const id = membershipId.trim();
    if (!id)
        return null;
    const snap = await getDb().collection('memberships').doc(id).get();
    if (!snap.exists)
        return null;
    const data = snap.data();
    if (!data || data.features == null)
        return null;
    return {
        features: data.features,
        syncVersion: typeof data.syncVersion === 'number' ? data.syncVersion : undefined,
    };
}
async function syncMembershipFeaturesToTenants(membershipId, featuresOverride) {
    const id = membershipId.trim();
    let features = featuresOverride;
    let syncVersion;
    if (!features) {
        const fromDb = await readMembershipFeaturesFromDb(id);
        if (!fromDb) {
            throw new Error('Membresía no encontrada');
        }
        features = fromDb.features;
        syncVersion = fromDb.syncVersion;
    }
    else {
        const snap = await getDb().collection('memberships').doc(id).get();
        if (!snap.exists) {
            throw new Error('Membresía no encontrada');
        }
        const data = snap.data();
        syncVersion = typeof (data === null || data === void 0 ? void 0 : data.syncVersion) === 'number' ? data.syncVersion : undefined;
    }
    const tenantsSnapshot = await getDb().collection('tenants')
        .where('membershipId', '==', id)
        .get();
    if (tenantsSnapshot.empty) {
        console.log(`No hay tenants usando la membresía ${id}`);
        return;
    }
    const batch = getDb().batch();
    const now = admin.firestore.Timestamp.now();
    tenantsSnapshot.docs.forEach((doc) => {
        const tenantRef = getDb().collection('tenants').doc(doc.id);
        batch.update(tenantRef, {
            featuresCache: features,
            featuresLastSynced: now,
            membershipSyncVersion: syncVersion !== null && syncVersion !== void 0 ? syncVersion : 0,
        });
    });
    await batch.commit();
    console.log(`✅ Features sincronizadas para ${tenantsSnapshot.size} tenants`);
}
async function getTenantFeaturesCached(tenantId) {
    const tenantDoc = await getDb().collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
        return null;
    }
    const tenantData = tenantDoc.data();
    const membershipId = tenantData === null || tenantData === void 0 ? void 0 : tenantData.membershipId;
    if (!membershipId) {
        return null;
    }
    if ((tenantData === null || tenantData === void 0 ? void 0 : tenantData.featuresCache) && (tenantData === null || tenantData === void 0 ? void 0 : tenantData.featuresLastSynced)) {
        const lastSynced = tenantData.featuresLastSynced.toDate();
        const now = new Date();
        const hoursSinceSync = (now.getTime() - lastSynced.getTime()) / (1000 * 60 * 60);
        if (hoursSinceSync < 1) {
            return tenantData.featuresCache;
        }
    }
    const fromDb = await readMembershipFeaturesFromDb(membershipId);
    if (!fromDb) {
        return null;
    }
    await getDb().collection('tenants').doc(tenantId).update({
        featuresCache: fromDb.features,
        featuresLastSynced: admin.firestore.FieldValue.serverTimestamp(),
        membershipSyncVersion: (_a = fromDb.syncVersion) !== null && _a !== void 0 ? _a : 0,
    });
    return fromDb.features;
    var _a;
}
async function setupMembershipSyncListener() {
    console.log('Listener de sincronización de membresías configurado');
}
