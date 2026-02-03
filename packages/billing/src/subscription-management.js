"use strict";
// Gestión completa de suscripciones con estados, facturación automática y suspensión
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
exports.getAllSubscriptions = getAllSubscriptions;
exports.getSubscriptionById = getSubscriptionById;
exports.getSubscriptionByTenantId = getSubscriptionByTenantId;
exports.updateSubscriptionStatus = updateSubscriptionStatus;
exports.suspendAccountForNonPayment = suspendAccountForNonPayment;
exports.reactivateAccountAfterPayment = reactivateAccountAfterPayment;
exports.changeMembership = changeMembership;
exports.getSubscriptionStats = getSubscriptionStats;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
const core_2 = require("@autodealers/core");
// NO inicializar db aquí - se inicializa en cada función
let db = null;
function getDb() {
    if (!db) {
        db = (0, core_1.getFirestore)();
    }
    return db;
}
/**
 * Obtiene todas las suscripciones con filtros opcionales
 */
async function getAllSubscriptions(filters) {
    console.log('🔍 [getAllSubscriptions] Buscando suscripciones con filtros:', filters);
    let query = getDb().collection('subscriptions');
    if (filters?.status) {
        query = query.where('status', '==', filters.status);
    }
    if (filters?.tenantId) {
        query = query.where('tenantId', '==', filters.tenantId);
        console.log('🔍 [getAllSubscriptions] Filtrando por tenantId:', filters.tenantId);
    }
    if (filters?.membershipId) {
        query = query.where('membershipId', '==', filters.membershipId);
    }
    try {
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        console.log('✅ [getAllSubscriptions] Query exitosa, encontradas:', snapshot.size, 'suscripciones');
        return mapSubscriptionDocs(snapshot.docs);
    }
    catch (error) {
        console.warn('⚠️ [getAllSubscriptions] Error con orderBy, intentando sin ordenar:', error.message);
        // Si falla por índice faltante, obtener sin ordenar
        const snapshot = await query.get();
        console.log('✅ [getAllSubscriptions] Query sin orderBy exitosa, encontradas:', snapshot.size, 'suscripciones');
        const subscriptions = mapSubscriptionDocs(snapshot.docs);
        subscriptions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return subscriptions;
    }
}
function mapSubscriptionDocs(docs) {
    return docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            currentPeriodStart: data?.currentPeriodStart?.toDate() || new Date(),
            currentPeriodEnd: data?.currentPeriodEnd?.toDate() || new Date(),
            lastPaymentDate: data?.lastPaymentDate?.toDate(),
            nextPaymentDate: data?.nextPaymentDate?.toDate(),
            suspendedAt: data?.suspendedAt?.toDate(),
            reactivatedAt: data?.reactivatedAt?.toDate(),
            cancelledAt: data?.cancelledAt?.toDate(),
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
    });
}
/**
 * Obtiene una suscripción por ID
 */
async function getSubscriptionById(subscriptionId) {
    const doc = await getDb().collection('subscriptions').doc(subscriptionId).get();
    if (!doc.exists) {
        return null;
    }
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        currentPeriodStart: data?.currentPeriodStart?.toDate() || new Date(),
        currentPeriodEnd: data?.currentPeriodEnd?.toDate() || new Date(),
        lastPaymentDate: data?.lastPaymentDate?.toDate(),
        nextPaymentDate: data?.nextPaymentDate?.toDate(),
        suspendedAt: data?.suspendedAt?.toDate(),
        reactivatedAt: data?.reactivatedAt?.toDate(),
        cancelledAt: data?.cancelledAt?.toDate(),
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
}
/**
 * Obtiene la suscripción activa de un tenant
 */
async function getSubscriptionByTenantId(tenantId) {
    console.log('🔍 [getSubscriptionByTenantId] Buscando suscripción para tenantId:', tenantId);
    const subscriptions = await getAllSubscriptions({ tenantId });
    console.log('🔍 [getSubscriptionByTenantId] Resultado de getAllSubscriptions:', {
        count: subscriptions.length,
        subscriptions: subscriptions.map(s => ({
            id: s.id,
            status: s.status,
            membershipId: s.membershipId,
        })),
    });
    // Retornar la más reciente o activa
    if (subscriptions.length === 0) {
        console.log('⚠️ [getSubscriptionByTenantId] No se encontraron suscripciones para tenantId:', tenantId);
        // Debug: buscar todas las suscripciones para ver qué hay
        try {
            const allSubs = await getAllSubscriptions();
            console.log('🔍 [getSubscriptionByTenantId] Debug - Total de suscripciones en Firestore:', allSubs.length);
            allSubs.slice(0, 10).forEach((sub, i) => {
                console.log(`  ${i + 1}. ID: ${sub.id}, tenantId: ${sub.tenantId}, status: ${sub.status}, membershipId: ${sub.membershipId}`);
            });
        }
        catch (debugError) {
            console.error('❌ [getSubscriptionByTenantId] Error en debug:', debugError);
        }
        return null;
    }
    // Priorizar suscripción activa
    const active = subscriptions.find(s => s.status === 'active');
    if (active) {
        console.log('✅ [getSubscriptionByTenantId] Encontrada suscripción activa:', {
            id: active.id,
            status: active.status,
            membershipId: active.membershipId,
        });
        return active;
    }
    // Si no hay activa, retornar la más reciente
    const latest = subscriptions[0];
    console.log('✅ [getSubscriptionByTenantId] Retornando suscripción más reciente:', {
        id: latest.id,
        status: latest.status,
        membershipId: latest.membershipId,
    });
    return latest;
}
/**
 * Actualiza el estado de una suscripción
 */
async function updateSubscriptionStatus(subscriptionId, status, additionalData) {
    const updates = {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (additionalData) {
        if (additionalData.daysPastDue !== undefined) {
            updates.daysPastDue = additionalData.daysPastDue;
        }
        if (additionalData.suspendedAt) {
            updates.suspendedAt = admin.firestore.Timestamp.fromDate(additionalData.suspendedAt);
        }
        if (additionalData.reactivatedAt) {
            updates.reactivatedAt = admin.firestore.Timestamp.fromDate(additionalData.reactivatedAt);
        }
        if (additionalData.lastPaymentDate) {
            updates.lastPaymentDate = admin.firestore.Timestamp.fromDate(additionalData.lastPaymentDate);
        }
        if (additionalData.nextPaymentDate) {
            updates.nextPaymentDate = admin.firestore.Timestamp.fromDate(additionalData.nextPaymentDate);
        }
        if (additionalData.statusReason) {
            updates.statusReason = additionalData.statusReason;
        }
    }
    await getDb().collection('subscriptions').doc(subscriptionId).update(updates);
}
/**
 * Suspende una cuenta automáticamente por falta de pago
 */
async function suspendAccountForNonPayment(subscriptionId) {
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) {
        throw new Error('Subscription not found');
    }
    // Actualizar estado de suscripción
    await updateSubscriptionStatus(subscriptionId, 'suspended', {
        suspendedAt: new Date(),
        daysPastDue: subscription.daysPastDue || 0,
        statusReason: 'Suspensión por falta de pago',
    });
    // Actualizar estado del tenant
    await (0, core_2.updateTenant)(subscription.tenantId, {
        status: 'suspended',
    });
    console.log(`Account ${subscription.tenantId} suspended for non-payment`);
}
/**
 * Reactiva una cuenta después de un pago exitoso
 */
async function reactivateAccountAfterPayment(subscriptionId) {
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) {
        throw new Error('Subscription not found');
    }
    // Actualizar estado de suscripción
    await updateSubscriptionStatus(subscriptionId, 'active', {
        reactivatedAt: new Date(),
        lastPaymentDate: new Date(),
        statusReason: 'Reactivación después de pago exitoso',
    });
    // Actualizar estado del tenant
    await (0, core_2.updateTenant)(subscription.tenantId, {
        status: 'active',
    });
    console.log(`Account ${subscription.tenantId} reactivated after payment`);
}
/**
 * Cambia la membresía de una suscripción
 */
async function changeMembership(subscriptionId, newMembershipId, newPriceId) {
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) {
        throw new Error('Subscription not found');
    }
    // Actualizar suscripción en Firestore
    await getDb().collection('subscriptions').doc(subscriptionId).update({
        membershipId: newMembershipId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        // El cambio real en Stripe se hace desde el frontend o webhook
    });
    // Actualizar el tenant con la nueva membresía (si tiene el campo)
    try {
        const tenantRef = getDb().collection('tenants').doc(subscription.tenantId);
        const tenantDoc = await tenantRef.get();
        if (tenantDoc.exists) {
            await tenantRef.update({
                membershipId: newMembershipId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }
    catch (error) {
        console.warn('Could not update tenant membershipId:', error);
    }
    // Actualizar membershipId en todos los usuarios del tenant
    const usersSnapshot = await (db || getDb())
        .collection('users')
        .where('tenantId', '==', subscription.tenantId)
        .get();
    const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    for (const user of users) {
        await getDb().collection('users').doc(user.id).update({
            membershipId: newMembershipId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    console.log(`Membership changed for subscription ${subscriptionId} to ${newMembershipId}`);
    console.log(`Updated ${users.length} users and tenant ${subscription.tenantId}`);
}
/**
 * Obtiene estadísticas de suscripciones
 */
async function getSubscriptionStats() {
    const allSubscriptions = await getAllSubscriptions();
    return {
        total: allSubscriptions.length,
        active: allSubscriptions.filter(s => s.status === 'active').length,
        suspended: allSubscriptions.filter(s => s.status === 'suspended').length,
        cancelled: allSubscriptions.filter(s => s.status === 'cancelled').length,
        pastDue: allSubscriptions.filter(s => s.status === 'past_due').length,
    };
}
//# sourceMappingURL=subscription-management.js.map