"use strict";
// Sistema de Features Dinámicas - Permite crear features personalizadas
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
exports.createDynamicFeature = createDynamicFeature;
exports.getDynamicFeatures = getDynamicFeatures;
exports.getDynamicFeatureByKey = getDynamicFeatureByKey;
exports.updateDynamicFeature = updateDynamicFeature;
exports.deleteDynamicFeature = deleteDynamicFeature;
exports.getDynamicFeaturesAsObject = getDynamicFeaturesAsObject;
exports.validateDynamicFeatureValue = validateDynamicFeatureValue;
const shared_1 = require("@autodealers/shared");
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
/**
 * Crea una nueva feature dinámica
 */
async function createDynamicFeature(feature, createdBy) {
    // Validar que la clave sea única
    const existing = await getDb().collection('dynamic_features')
        .where('key', '==', feature.key)
        .get();
    if (!existing.empty) {
        throw new Error(`Ya existe una feature con la clave "${feature.key}"`);
    }
    const docRef = getDb().collection('dynamic_features').doc();
    await docRef.set({
        ...feature,
        createdBy,
        isActive: feature.isActive !== undefined ? feature.isActive : true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        id: docRef.id,
        ...feature,
        createdBy: createdBy || 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Obtiene todas las features dinámicas activas
 */
async function getDynamicFeatures(category, activeOnly = true) {
    let query = getDb().collection('dynamic_features');
    if (activeOnly) {
        query = query.where('isActive', '==', true);
    }
    if (category) {
        query = query.where('category', '==', category);
    }
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
    });
}
/**
 * Obtiene una feature dinámica por su clave
 */
async function getDynamicFeatureByKey(key) {
    const snapshot = await getDb().collection('dynamic_features')
        .where('key', '==', key)
        .where('isActive', '==', true)
        .limit(1)
        .get();
    if (snapshot.empty) {
        return null;
    }
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
}
/**
 * Actualiza una feature dinámica
 */
async function updateDynamicFeature(featureId, updates) {
    await getDb().collection('dynamic_features').doc(featureId).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Elimina (desactiva) una feature dinámica
 */
async function deleteDynamicFeature(featureId) {
    await getDb().collection('dynamic_features').doc(featureId).update({
        isActive: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Obtiene todas las features dinámicas y las convierte en un objeto para usar en membresías
 */
async function getDynamicFeaturesAsObject() {
    const features = await getDynamicFeatures(undefined, true);
    const result = {};
    features.forEach((feature) => {
        result[feature.key] = feature.defaultValue !== undefined
            ? feature.defaultValue
            : feature.type === 'boolean'
                ? false
                : feature.type === 'number'
                    ? 0
                    : '';
    });
    return result;
}
/**
 * Valida el valor de una feature dinámica según su tipo
 */
function validateDynamicFeatureValue(feature, value) {
    switch (feature.type) {
        case 'boolean':
            if (typeof value !== 'boolean') {
                return { valid: false, error: `El valor debe ser true o false` };
            }
            return { valid: true };
        case 'number':
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            if (isNaN(numValue)) {
                return { valid: false, error: `El valor debe ser un número` };
            }
            if (feature.min !== undefined && numValue < feature.min) {
                return { valid: false, error: `El valor mínimo es ${feature.min}` };
            }
            if (feature.max !== undefined && numValue > feature.max) {
                return { valid: false, error: `El valor máximo es ${feature.max}` };
            }
            return { valid: true };
        case 'string':
            if (typeof value !== 'string') {
                return { valid: false, error: `El valor debe ser un texto` };
            }
            return { valid: true };
        case 'select':
            if (!feature.options || !feature.options.includes(value)) {
                return { valid: false, error: `El valor debe ser uno de: ${feature.options?.join(', ') || ''}` };
            }
            return { valid: true };
        default:
            return { valid: false, error: `Tipo de feature no reconocido` };
    }
}
