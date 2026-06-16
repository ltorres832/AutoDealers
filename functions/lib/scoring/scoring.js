"use strict";
/**
 * Cloud Functions para Scoring
 *
 * Funcionalidades:
 * - Obtener configuración de scoring
 * - Crear/actualizar/eliminar reglas de scoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteScoringRule = exports.updateScoringRule = exports.createScoringRule = exports.getScoringConfig = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
/**
 * Obtener configuración de scoring
 */
exports.getScoringConfig = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    const configDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('scoring_config')
        .doc('main')
        .get();
    if (!configDoc.exists) {
        return { rules: [] };
    }
    const configData = configDoc.data();
    return { rules: configData.rules || [] };
});
/**
 * Crear regla de scoring
 */
exports.createScoringRule = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const { tenantId, rule } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !rule) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const configRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('scoring_config')
        .doc('main');
    const configDoc = await configRef.get();
    const currentRules = configDoc.exists ? (((_b = configDoc.data()) === null || _b === void 0 ? void 0 : _b.rules) || []) : [];
    const newRule = {
        id: `rule_${Date.now()}`,
        tenantId,
        name: rule.name,
        enabled: rule.enabled !== false,
        conditions: rule.conditions || [],
        points: rule.points || 10,
        priority: rule.priority || 1,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    const updatedRules = [...currentRules, newRule];
    await configRef.set({
        rules: updatedRules,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { rule: newRule };
});
/**
 * Actualizar regla de scoring
 */
exports.updateScoringRule = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const { tenantId, ruleId, updates } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !ruleId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const configRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('scoring_config')
        .doc('main');
    const configDoc = await configRef.get();
    if (!configDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Configuración de scoring no encontrada');
    }
    const currentRules = ((_b = configDoc.data()) === null || _b === void 0 ? void 0 : _b.rules) || [];
    const updatedRules = currentRules.map((rule) => rule.id === ruleId
        ? Object.assign(Object.assign(Object.assign({}, rule), updates), { updatedAt: firestore_1.FieldValue.serverTimestamp() }) : rule);
    await configRef.update({
        rules: updatedRules,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    const updatedRule = updatedRules.find((r) => r.id === ruleId);
    return { rule: updatedRule };
});
/**
 * Eliminar regla de scoring
 */
exports.deleteScoringRule = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const { tenantId, ruleId } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !ruleId) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const configRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('scoring_config')
        .doc('main');
    const configDoc = await configRef.get();
    if (!configDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Configuración de scoring no encontrada');
    }
    const currentRules = ((_b = configDoc.data()) === null || _b === void 0 ? void 0 : _b.rules) || [];
    const updatedRules = currentRules.filter((rule) => rule.id !== ruleId);
    await configRef.update({
        rules: updatedRules,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
//# sourceMappingURL=scoring.js.map