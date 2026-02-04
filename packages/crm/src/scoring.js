"use strict";
// Sistema de scoring avanzado de leads
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
exports.calculateAutomaticScore = calculateAutomaticScore;
exports.updateLeadScore = updateLeadScore;
exports.getScoringConfig = getScoringConfig;
exports.saveScoringConfig = saveScoringConfig;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
const db = (0, core_1.getFirestore)();
/**
 * Calcula el score automático de un lead
 */
async function calculateAutomaticScore(tenantId, lead) {
    const config = await getScoringConfig(tenantId);
    if (!config.enabled || !config.autoCalculate) {
        return 0;
    }
    let score = 0;
    // Aplicar reglas de scoring
    const sortedRules = config.rules
        .filter(r => r.enabled)
        .sort((a, b) => a.priority - b.priority);
    for (const rule of sortedRules) {
        if (evaluateScoringRule(lead, rule)) {
            score += rule.points;
        }
    }
    // Aplicar factores adicionales
    score += calculateSourceScore(lead.source);
    score += calculateInteractionScore(lead.interactions);
    score += calculateResponseTimeScore(lead);
    score += calculateAIClassificationScore(lead.aiClassification);
    // Limitar al máximo
    return Math.min(score, config.maxScore);
}
/**
 * Evalúa si una regla de scoring se cumple
 */
function evaluateScoringRule(lead, rule) {
    return rule.conditions.every(condition => {
        switch (condition.field) {
            case 'source':
                return condition.operator === 'equals' && lead.source === condition.value;
            case 'status':
                return condition.operator === 'equals' && lead.status === condition.value;
            case 'interactions':
                if (condition.operator === 'greaterThan') {
                    return lead.interactions.length > condition.value;
                }
                return false;
            case 'responseTime':
                // Calcular tiempo de respuesta promedio
                return false; // TODO: Implementar
            case 'emailOpened':
                // Verificar si email fue abierto
                return false; // TODO: Implementar
            case 'linkClicked':
                // Verificar si link fue clickeado
                return false; // TODO: Implementar
            case 'documentUploaded':
                // Verificar si documento fue subido
                return lead.documents && lead.documents.length > 0;
            case 'appointmentScheduled':
                // Verificar si tiene cita programada
                return lead.status === 'appointment' || lead.status === 'test_drive';
            default:
                return false;
        }
    });
}
/**
 * Calcula score basado en fuente
 */
function calculateSourceScore(source) {
    const sourceScores = {
        'web': 10,
        'whatsapp': 15,
        'facebook': 12,
        'instagram': 12,
        'email': 8,
        'phone': 20,
        'sms': 10,
    };
    return sourceScores[source] || 5;
}
/**
 * Calcula score basado en interacciones
 */
function calculateInteractionScore(interactions) {
    if (!interactions || interactions.length === 0)
        return 0;
    let score = 0;
    score += interactions.length * 2; // 2 puntos por interacción
    // Bonus por múltiples interacciones
    if (interactions.length >= 5)
        score += 10;
    if (interactions.length >= 10)
        score += 15;
    return Math.min(score, 30);
}
/**
 * Calcula score basado en tiempo de respuesta
 */
function calculateResponseTimeScore(lead) {
    // TODO: Implementar cálculo de tiempo de respuesta
    return 0;
}
/**
 * Calcula score basado en clasificación de IA
 */
function calculateAIClassificationScore(classification) {
    if (!classification)
        return 0;
    let score = 0;
    if (classification.priority === 'high')
        score += 20;
    else if (classification.priority === 'medium')
        score += 10;
    else if (classification.priority === 'low')
        score += 5;
    if (classification.sentiment === 'positive')
        score += 10;
    else if (classification.sentiment === 'negative')
        score -= 5;
    return score;
}
/**
 * Actualiza el score de un lead
 */
async function updateLeadScore(tenantId, leadId, automaticScore, manualScore, reason, updatedBy) {
    const leadRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .doc(leadId);
    const leadDoc = await leadRef.get();
    if (!leadDoc.exists) {
        throw new Error('Lead not found');
    }
    const leadData = leadDoc.data();
    const config = await getScoringConfig(tenantId);
    const weights = config.weights || { automatic: 0.7, manual: 0.3 };
    const combinedScore = manualScore !== undefined
        ? Math.round(automaticScore * weights.automatic + manualScore * weights.manual)
        : automaticScore;
    const scoreHistory = {
        score: automaticScore,
        type: 'automatic',
        reason,
        updatedBy,
        updatedAt: new Date(),
    };
    const currentHistory = leadData.score?.history || [];
    const newHistory = [...currentHistory, scoreHistory].slice(-50); // Mantener últimos 50
    await leadRef.update({
        score: {
            automatic: automaticScore,
            manual: manualScore,
            combined: combinedScore,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            history: newHistory.map(h => ({
                ...h,
                updatedAt: admin.firestore.Timestamp.fromDate(h.updatedAt),
            })),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Obtiene configuración de scoring
 */
async function getScoringConfig(tenantId) {
    const configDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('settings')
        .doc('scoring')
        .get();
    if (!configDoc.exists) {
        // Configuración por defecto
        return {
            tenantId,
            enabled: true,
            autoCalculate: true,
            manualOverride: true,
            maxScore: 100,
            rules: [],
            weights: {
                automatic: 0.7,
                manual: 0.3,
            },
            updatedAt: new Date(),
        };
    }
    const data = configDoc.data();
    return {
        ...data,
        updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
}
/**
 * Guarda configuración de scoring
 */
async function saveScoringConfig(tenantId, config) {
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('settings')
        .doc('scoring')
        .set({
        ...config,
        tenantId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}
//# sourceMappingURL=scoring.js.map