"use strict";
/**
 * Cloud Functions para Policies
 *
 * Funcionalidades:
 * - Inicializar políticas por defecto
 * - Obtener políticas
 * - Crear/actualizar políticas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePolicy = exports.createPolicy = exports.getPolicies = exports.initializePolicies = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
/**
 * Inicializar políticas por defecto
 */
exports.initializePolicies = (0, https_1.onCall)(async (request) => {
    var _a;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || authToken.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Solo administradores pueden inicializar políticas');
    }
    const defaultPolicies = [
        {
            type: 'privacy',
            title: 'Política de Privacidad',
            content: `# Política de Privacidad

## 1. Información que Recopilamos
Recopilamos información que usted nos proporciona directamente, información recopilada automáticamente e información de terceros.

## 2. Cómo Usamos su Información
Utilizamos la información recopilada para proporcionar y mejorar nuestros servicios.

## 3. Seguridad
Implementamos medidas de seguridad técnicas y organizativas para proteger su información.

Última actualización: ${new Date().toLocaleDateString('es-ES')}`,
            version: '1.0',
            language: 'es',
            isActive: true,
            isRequired: true,
            requiresAcceptance: true,
            applicableTo: ['public', 'dealer', 'seller'],
            effectiveDate: firestore_1.FieldValue.serverTimestamp(),
            createdBy: authToken.uid,
        },
        {
            type: 'terms',
            title: 'Términos y Condiciones',
            content: `# Términos y Condiciones

## 1. Aceptación de los Términos
Al acceder y usar esta plataforma, usted acepta estar sujeto a estos términos y condiciones.

## 2. Uso de la Plataforma
Usted se compromete a usar la plataforma de manera legal y ética.

Última actualización: ${new Date().toLocaleDateString('es-ES')}`,
            version: '1.0',
            language: 'es',
            isActive: true,
            isRequired: true,
            requiresAcceptance: true,
            applicableTo: ['public', 'dealer', 'seller'],
            effectiveDate: firestore_1.FieldValue.serverTimestamp(),
            createdBy: authToken.uid,
        },
    ];
    const createdPolicies = [];
    for (const policyData of defaultPolicies) {
        try {
            const policyRef = db.collection('policies').doc();
            await policyRef.set(Object.assign(Object.assign({}, policyData), { createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp() }));
            createdPolicies.push(Object.assign({ id: policyRef.id }, policyData));
        }
        catch (error) {
            console.error(`Error creando política ${policyData.type}:`, error);
        }
    }
    return {
        success: true,
        message: `${createdPolicies.length} políticas creadas`,
        policies: createdPolicies,
    };
});
/**
 * Obtener políticas
 */
exports.getPolicies = (0, https_1.onCall)(async (request) => {
    const { type, language, applicableTo } = request.data;
    let query = db.collection('policies').where('isActive', '==', true);
    if (type) {
        query = query.where('type', '==', type);
    }
    if (language) {
        query = query.where('language', '==', language);
    }
    const snapshot = await query.get();
    let policies = snapshot.docs.map((doc) => {
        var _a, _b, _c, _d, _e, _f;
        const data = doc.data();
        return Object.assign(Object.assign({ id: doc.id }, data), { effectiveDate: ((_b = (_a = data.effectiveDate) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || data.effectiveDate, createdAt: ((_d = (_c = data.createdAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || data.createdAt, updatedAt: ((_f = (_e = data.updatedAt) === null || _e === void 0 ? void 0 : _e.toDate) === null || _f === void 0 ? void 0 : _f.call(_e)) || data.updatedAt });
    });
    // Filtrar por applicableTo si se proporciona
    if (applicableTo) {
        policies = policies.filter((p) => { var _a; return (_a = p.applicableTo) === null || _a === void 0 ? void 0 : _a.includes(applicableTo); });
    }
    return { policies };
});
/**
 * Crear política
 */
exports.createPolicy = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const { policy } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || authToken.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Solo administradores pueden crear políticas');
    }
    if (!policy || !policy.type || !policy.title || !policy.content) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const policyRef = db.collection('policies').doc();
    await policyRef.set(Object.assign(Object.assign({}, policy), { createdBy: authToken.uid, createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp() }));
    const createdDoc = await policyRef.get();
    const createdData = createdDoc.data();
    return Object.assign(Object.assign({ id: policyRef.id }, createdData), { effectiveDate: ((_c = (_b = createdData.effectiveDate) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) || createdData.effectiveDate, createdAt: ((_e = (_d = createdData.createdAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) || createdData.createdAt, updatedAt: ((_g = (_f = createdData.updatedAt) === null || _f === void 0 ? void 0 : _f.toDate) === null || _g === void 0 ? void 0 : _g.call(_f)) || createdData.updatedAt });
});
/**
 * Actualizar política
 */
exports.updatePolicy = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const { policyId, policy } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || authToken.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Solo administradores pueden actualizar políticas');
    }
    if (!policyId || !policy) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const policyRef = db.collection('policies').doc(policyId);
    await policyRef.update(Object.assign(Object.assign({}, policy), { updatedAt: firestore_1.FieldValue.serverTimestamp() }));
    const updatedDoc = await policyRef.get();
    const updatedData = updatedDoc.data();
    return Object.assign(Object.assign({ id: policyRef.id }, updatedData), { effectiveDate: ((_c = (_b = updatedData.effectiveDate) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) || updatedData.effectiveDate, createdAt: ((_e = (_d = updatedData.createdAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) || updatedData.createdAt, updatedAt: ((_g = (_f = updatedData.updatedAt) === null || _f === void 0 ? void 0 : _f.toDate) === null || _g === void 0 ? void 0 : _g.call(_f)) || updatedData.updatedAt });
});
//# sourceMappingURL=policies.js.map