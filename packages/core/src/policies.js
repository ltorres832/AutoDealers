"use strict";
// Sistema de Políticas y Disclosures
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
exports.createPolicy = createPolicy;
exports.getActivePolicies = getActivePolicies;
exports.getRequiredPoliciesForUser = getRequiredPoliciesForUser;
exports.acceptPolicy = acceptPolicy;
exports.hasUserAcceptedPolicy = hasUserAcceptedPolicy;
exports.getAllPolicies = getAllPolicies;
exports.updatePolicy = updatePolicy;
exports.deletePolicy = deletePolicy;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
/**
 * Crea una nueva política
 */
async function createPolicy(policy) {
    const docRef = getDb().collection('policies').doc();
    const policyData = {
        ...policy,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await docRef.set(policyData);
    return {
        id: docRef.id,
        ...policy,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Obtiene todas las políticas activas para un tipo y rol específicos
 */
async function getActivePolicies(type, role, tenantId, language = 'es') {
    let query = getDb().collection('policies')
        .where('type', '==', type)
        .where('isActive', '==', true)
        .where('language', '==', language)
        .where('applicableTo', 'array-contains', role);
    // Si hay tenantId, buscar políticas específicas del tenant o globales
    if (tenantId) {
        // Primero buscar políticas específicas del tenant
        const tenantPolicies = await query
            .where('tenantId', '==', tenantId)
            .orderBy('effectiveDate', 'desc')
            .get();
        if (!tenantPolicies.empty) {
            return tenantPolicies.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                effectiveDate: doc.data().effectiveDate?.toDate() || new Date(),
                expirationDate: doc.data().expirationDate?.toDate(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            }));
        }
    }
    // Buscar políticas globales (sin tenantId)
    const globalPolicies = await query
        .where('tenantId', '==', null)
        .orderBy('effectiveDate', 'desc')
        .get();
    return globalPolicies.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        effectiveDate: doc.data().effectiveDate?.toDate() || new Date(),
        expirationDate: doc.data().expirationDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));
}
/**
 * Obtiene todas las políticas requeridas que el usuario aún no ha aceptado
 */
async function getRequiredPoliciesForUser(userId, role, tenantId, language = 'es') {
    // Obtener todas las políticas requeridas
    const allRequiredPolicies = await getDb().collection('policies')
        .where('isRequired', '==', true)
        .where('isActive', '==', true)
        .where('language', '==', language)
        .where('applicableTo', 'array-contains', role)
        .get();
    // Obtener políticas aceptadas por el usuario
    const acceptedPoliciesSnapshot = await getDb().collection('policy_acceptances')
        .where('userId', '==', userId)
        .get();
    const acceptedPolicyIds = new Set(acceptedPoliciesSnapshot.docs.map(doc => doc.data().policyId));
    // Filtrar políticas no aceptadas y verificar fechas
    const now = new Date();
    const requiredPolicies = [];
    allRequiredPolicies.docs.forEach(doc => {
        const policyData = doc.data();
        const effectiveDate = policyData.effectiveDate?.toDate() || new Date();
        const expirationDate = policyData.expirationDate?.toDate();
        // Verificar si la política está vigente
        if (effectiveDate > now)
            return; // Aún no es efectiva
        if (expirationDate && expirationDate < now)
            return; // Ya expiró
        // Verificar si es específica del tenant o global
        if (policyData.tenantId && policyData.tenantId !== tenantId)
            return;
        if (!policyData.tenantId && tenantId) {
            // Es global, verificar si hay una específica del tenant que la reemplace
            // (esto se manejaría en la lógica de getActivePolicies)
        }
        // Verificar si el usuario ya la aceptó (y si la versión es la misma)
        const acceptance = acceptedPoliciesSnapshot.docs.find(accDoc => accDoc.data().policyId === doc.id);
        if (acceptance) {
            const acceptedVersion = acceptance.data().policyVersion;
            if (acceptedVersion === policyData.version) {
                return; // Ya aceptó esta versión
            }
        }
        requiredPolicies.push({
            id: doc.id,
            ...policyData,
            effectiveDate,
            expirationDate,
            createdAt: policyData.createdAt?.toDate() || new Date(),
            updatedAt: policyData.updatedAt?.toDate() || new Date(),
        });
    });
    return requiredPolicies;
}
/**
 * Registra la aceptación de una política por un usuario
 */
async function acceptPolicy(userId, policyId, ipAddress, userAgent) {
    // Obtener la política
    const policyDoc = await getDb().collection('policies').doc(policyId).get();
    if (!policyDoc.exists) {
        throw new Error('Política no encontrada');
    }
    const policyData = policyDoc.data();
    // Crear registro de aceptación
    const docRef = getDb().collection('policy_acceptances').doc();
    const acceptanceData = {
        userId,
        policyId,
        policyVersion: policyData?.version || '1.0',
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        ipAddress,
        userAgent,
    };
    await docRef.set(acceptanceData);
    return {
        id: docRef.id,
        userId,
        policyId,
        policyVersion: policyData?.version || '1.0',
        acceptedAt: new Date(),
        ipAddress,
        userAgent,
    };
}
/**
 * Verifica si un usuario ha aceptado una política específica
 */
async function hasUserAcceptedPolicy(userId, policyId, version) {
    let query = getDb().collection('policy_acceptances')
        .where('userId', '==', userId)
        .where('policyId', '==', policyId);
    if (version) {
        query = query.where('policyVersion', '==', version);
    }
    const snapshot = await query.limit(1).get();
    return !snapshot.empty;
}
/**
 * Obtiene todas las políticas (para admin)
 */
async function getAllPolicies(tenantId, language) {
    let query = getDb().collection('policies');
    if (tenantId) {
        query = query.where('tenantId', '==', tenantId);
    }
    if (language) {
        query = query.where('language', '==', language);
    }
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        effectiveDate: doc.data().effectiveDate?.toDate() || new Date(),
        expirationDate: doc.data().expirationDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));
}
/**
 * Actualiza una política
 */
async function updatePolicy(policyId, updates) {
    const docRef = getDb().collection('policies').doc(policyId);
    const updateData = {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    delete updateData.id;
    delete updateData.createdAt;
    await docRef.update(updateData);
    const updated = await docRef.get();
    return {
        id: updated.id,
        ...updated.data(),
        effectiveDate: updated.data()?.effectiveDate?.toDate() || new Date(),
        expirationDate: updated.data()?.expirationDate?.toDate(),
        createdAt: updated.data()?.createdAt?.toDate() || new Date(),
        updatedAt: updated.data()?.updatedAt?.toDate() || new Date(),
    };
}
/**
 * Elimina una política (soft delete)
 */
async function deletePolicy(policyId) {
    await getDb().collection('policies').doc(policyId).update({
        isActive: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
