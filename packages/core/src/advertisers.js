"use strict";
// Sistema de anunciantes (empresas externas)
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
exports.createAdvertiser = createAdvertiser;
exports.getAdvertiserById = getAdvertiserById;
exports.createSponsoredContent = createSponsoredContent;
exports.getActiveSponsoredContent = getActiveSponsoredContent;
exports.updateSponsoredContentMetrics = updateSponsoredContentMetrics;
exports.getAdvertiserContent = getAdvertiserContent;
const shared_1 = require("@autodealers/shared");
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
const auth = (0, shared_1.getAuth)();
/**
 * Crea un nuevo anunciante
 */
async function createAdvertiser(advertiserData) {
    // Crear usuario en Firebase Auth
    const password = Math.random().toString(36).slice(-12) + 'A1!'; // Generar password temporal
    const userRecord = await auth.createUser({
        email: advertiserData.email,
        password,
        displayName: advertiserData.contactName,
    });
    // Establecer custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
        role: 'advertiser',
    });
    // Crear documento en Firestore
    const advertiserRef = getDb().collection('advertisers').doc(userRecord.uid);
    await advertiserRef.set({
        ...advertiserData,
        status: advertiserData.status || 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // TODO: Enviar email con credenciales
    return {
        id: advertiserRef.id,
        ...advertiserData,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Obtiene un anunciante por ID
 */
async function getAdvertiserById(advertiserId) {
    const doc = await getDb().collection('advertisers').doc(advertiserId).get();
    if (!doc.exists) {
        return null;
    }
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        defaultPaymentMethod: data?.defaultPaymentMethod,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
        lastLogin: data?.lastLogin?.toDate(),
    };
}
/**
 * Crea contenido patrocinado con validación de límites del plan
 */
async function createSponsoredContent(contentData) {
    const payPerAd = contentData.billingMode === 'per_ad' || contentData.status === 'payment_pending';
    if (!payPerAd) {
        const { canCreateBanner } = await Promise.resolve().then(() => __importStar(require('./advertiser-limits')));
        const bannerCheck = await canCreateBanner(contentData.advertiserId, contentData.placement);
        if (!bannerCheck.allowed) {
            throw new Error(bannerCheck.reason || 'No se puede crear el banner');
        }
    }
    const contentRef = getDb().collection('sponsored_content').doc();
    await contentRef.set({
        ...contentData,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        status: contentData.status || 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        id: contentRef.id,
        ...contentData,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Obtiene contenido patrocinado activo para mostrar públicamente
 */
async function getActiveSponsoredContent(placement, limit) {
    let query = getDb().collection('sponsored_content')
        .where('status', '==', 'active');
    if (placement) {
        query = query.where('placement', '==', placement);
    }
    const now = admin.firestore.Timestamp.now();
    query = query
        .where('startDate', '<=', now)
        .where('endDate', '>=', now);
    query = query.orderBy('createdAt', 'desc');
    if (limit) {
        query = query.limit(limit);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            startDate: data.startDate?.toDate() || new Date(),
            endDate: data.endDate?.toDate() || new Date(),
            approvedAt: data.approvedAt?.toDate(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        };
    });
}
/**
 * Actualiza métricas de contenido patrocinado con validación de límites
 */
async function updateSponsoredContentMetrics(contentId, type) {
    // Obtener el contenido para verificar límites
    const contentDoc = await getDb().collection('sponsored_content').doc(contentId).get();
    if (!contentDoc.exists) {
        throw new Error('Contenido no encontrado');
    }
    const content = contentDoc.data();
    const advertiserId = content.advertiserId;
    // Si es una impresión, verificar límites del plan
    if (type === 'impression') {
        const { checkAndIncrementImpression } = await Promise.resolve().then(() => __importStar(require('./advertiser-limits')));
        const check = await checkAndIncrementImpression(contentId, advertiserId);
        if (!check.allowed) {
            // Pausar automáticamente el contenido si alcanzó el límite
            await getDb().collection('sponsored_content').doc(contentId).update({
                status: 'paused',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return {
                success: false,
                reason: check.reason || 'Límite de impresiones alcanzado',
            };
        }
        // Registrar impresión en métricas mensuales
        const { recordMonthlyImpression } = await Promise.resolve().then(() => __importStar(require('./advertiser-metrics')));
        await recordMonthlyImpression(contentId, advertiserId);
    }
    const contentRef = getDb().collection('sponsored_content').doc(contentId);
    const updateData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    switch (type) {
        case 'impression':
            updateData.impressions = admin.firestore.FieldValue.increment(1);
            break;
        case 'click':
            updateData.clicks = admin.firestore.FieldValue.increment(1);
            // También actualizar métricas mensuales para clicks
            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const metricsRef = getDb().collection('sponsored_content')
                .doc(contentId)
                .collection('monthly_metrics')
                .doc(monthKey);
            const metricsDoc = await metricsRef.get();
            if (metricsDoc.exists) {
                await metricsRef.update({
                    clicks: admin.firestore.FieldValue.increment(1),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            else {
                await metricsRef.set({
                    month: monthKey,
                    impressions: 0,
                    clicks: 1,
                    conversions: 0,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            break;
        case 'conversion':
            updateData.conversions = admin.firestore.FieldValue.increment(1);
            // También actualizar métricas mensuales para conversiones
            const now2 = new Date();
            const monthKey2 = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}`;
            const metricsRef2 = getDb().collection('sponsored_content')
                .doc(contentId)
                .collection('monthly_metrics')
                .doc(monthKey2);
            const metricsDoc2 = await metricsRef2.get();
            if (metricsDoc2.exists) {
                await metricsRef2.update({
                    conversions: admin.firestore.FieldValue.increment(1),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            else {
                await metricsRef2.set({
                    month: monthKey2,
                    impressions: 0,
                    clicks: 0,
                    conversions: 1,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            break;
    }
    await contentRef.update(updateData);
    return { success: true };
}
/**
 * Obtiene contenido patrocinado de un anunciante
 */
async function getAdvertiserContent(advertiserId) {
    // Evitar requerir índices compuestos: no usamos orderBy para este listado.
    const snapshot = await getDb().collection('sponsored_content')
        .where('advertiserId', '==', advertiserId)
        .get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            startDate: data.startDate?.toDate() || new Date(),
            endDate: data.endDate?.toDate() || new Date(),
            approvedAt: data.approvedAt?.toDate(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        };
    });
}
