"use strict";
// Sistema de preguntas frecuentes automáticas
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
exports.createFAQ = createFAQ;
exports.getActiveFAQs = getActiveFAQs;
exports.findFAQ = findFAQ;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
/**
 * Crea una FAQ
 */
async function createFAQ(faq) {
    const docRef = db
        .collection('tenants')
        .doc(faq.tenantId)
        .collection('faqs')
        .doc();
    await docRef.set({
        ...faq,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        id: docRef.id,
        ...faq,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Obtiene FAQs activas
 */
async function getActiveFAQs(tenantId) {
    const snapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('faqs')
        .where('isActive', '==', true)
        .orderBy('order', 'asc')
        .get();
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
 * Busca FAQ por pregunta o keywords
 */
async function findFAQ(tenantId, query) {
    const faqs = await getActiveFAQs(tenantId);
    const queryLower = query.toLowerCase();
    // Buscar por pregunta exacta
    for (const faq of faqs) {
        if (faq.question.toLowerCase().includes(queryLower)) {
            return faq;
        }
    }
    // Buscar por keywords
    for (const faq of faqs) {
        const hasKeyword = faq.keywords.some((keyword) => queryLower.includes(keyword.toLowerCase()));
        if (hasKeyword) {
            return faq;
        }
    }
    return null;
}
