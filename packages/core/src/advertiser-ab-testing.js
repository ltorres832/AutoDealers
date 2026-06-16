"use strict";
// Sistema de A/B Testing para contenido patrocinado
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
exports.createABTest = createABTest;
exports.selectVariant = selectVariant;
exports.getActiveABTestForContent = getActiveABTestForContent;
exports.updateVariantMetrics = updateVariantMetrics;
exports.determineABTestWinner = determineABTestWinner;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
/**
 * Crea un test A/B para contenido patrocinado
 */
async function createABTest(advertiserId, testName, variants, trafficSplit = 'equal') {
    const testRef = getDb().collection('ab_tests').doc();
    const abTest = {
        advertiserId,
        testName,
        variants: variants.map((v, index) => ({
            ...v,
            id: `variant-${index}`,
            impressions: 0,
            clicks: 0,
            conversions: 0,
        })),
        status: 'active',
        startDate: new Date(),
        trafficSplit,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    await testRef.set({
        ...abTest,
        startDate: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        id: testRef.id,
        ...abTest,
    };
}
/**
 * Selecciona una variante para mostrar según distribución de tráfico
 */
function selectVariant(variants, trafficSplit) {
    if (variants.length === 0) {
        throw new Error('No hay variantes disponibles');
    }
    if (variants.length === 1) {
        return variants[0];
    }
    if (trafficSplit === 'equal') {
        // Distribución igual: seleccionar aleatoriamente
        const randomIndex = Math.floor(Math.random() * variants.length);
        return variants[randomIndex];
    }
    else {
        // Distribución por peso
        const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
        const random = Math.random() * totalWeight;
        let currentWeight = 0;
        for (const variant of variants) {
            currentWeight += variant.weight;
            if (random <= currentWeight) {
                return variant;
            }
        }
        // Fallback al último
        return variants[variants.length - 1];
    }
}
/**
 * Obtiene el test A/B activo para un contenido
 */
async function getActiveABTestForContent(contentId) {
    const snapshot = await getDb().collection('ab_tests')
        .where('status', '==', 'active')
        .get();
    for (const doc of snapshot.docs) {
        const test = doc.data();
        const hasVariant = test.variants.some((v) => v.contentId === contentId);
        if (hasVariant) {
            return {
                id: doc.id,
                ...test,
                startDate: test.startDate?.toDate() || new Date(),
                endDate: test.endDate?.toDate(),
                createdAt: test.createdAt?.toDate() || new Date(),
                updatedAt: test.updatedAt?.toDate() || new Date(),
            };
        }
    }
    return null;
}
/**
 * Actualiza métricas de una variante
 */
async function updateVariantMetrics(testId, variantId, type) {
    const testRef = getDb().collection('ab_tests').doc(testId);
    const testDoc = await testRef.get();
    if (!testDoc.exists) {
        throw new Error('Test A/B no encontrado');
    }
    const test = testDoc.data();
    const variants = test.variants || [];
    const variantIndex = variants.findIndex((v) => v.id === variantId);
    if (variantIndex === -1) {
        throw new Error('Variante no encontrada');
    }
    const updateField = type === 'impression' ? 'impressions' : type === 'click' ? 'clicks' : 'conversions';
    variants[variantIndex][updateField] = (variants[variantIndex][updateField] || 0) + 1;
    await testRef.update({
        variants,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Determina el ganador del test A/B basado en CTR
 */
async function determineABTestWinner(testId) {
    const testDoc = await getDb().collection('ab_tests').doc(testId).get();
    if (!testDoc.exists) {
        return null;
    }
    const test = testDoc.data();
    const variants = test.variants || [];
    if (variants.length === 0) {
        return null;
    }
    // Calcular CTR para cada variante
    const variantsWithCTR = variants.map((v) => ({
        ...v,
        ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
    }));
    // Ordenar por CTR descendente
    variantsWithCTR.sort((a, b) => b.ctr - a.ctr);
    // El ganador es el que tiene mayor CTR con al menos 100 impresiones
    const winner = variantsWithCTR.find((v) => v.impressions >= 100);
    if (winner) {
        // Marcar ganador y actualizar
        const updatedVariants = variants.map((v) => ({
            ...v,
            isWinner: v.id === winner.id,
        }));
        await getDb().collection('ab_tests').doc(testId).update({
            variants: updatedVariants,
            status: 'completed',
            endDate: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return winner.id;
    }
    return null;
}
