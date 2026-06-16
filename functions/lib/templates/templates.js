"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultTemplateFunction = exports.processTemplateFunction = exports.deleteTemplateFunction = exports.updateTemplateFunction = exports.getTemplatesFunction = exports.getTemplateByIdFunction = exports.createTemplateFunction = void 0;
// Cloud Functions para Templates
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const core_1 = require("@autodealers/core");
const db = (0, firestore_1.getFirestore)();
// Crear template
exports.createTemplateFunction = (0, https_1.onCall)(async (request) => {
    const { template, tenantId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!template) {
        throw new https_1.HttpsError('invalid-argument', 'template es requerido');
    }
    try {
        const newTemplate = await (0, core_1.createTemplate)(template, tenantId);
        return { template: newTemplate };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear template: ${error.message}`);
    }
});
// Obtener template por ID
exports.getTemplateByIdFunction = (0, https_1.onCall)(async (request) => {
    const { templateId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!templateId) {
        throw new https_1.HttpsError('invalid-argument', 'templateId es requerido');
    }
    try {
        const template = await (0, core_1.getTemplateById)(templateId);
        if (!template) {
            throw new https_1.HttpsError('not-found', 'Template no encontrado');
        }
        return { template };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al obtener template: ${error.message}`);
    }
});
// Obtener templates
exports.getTemplatesFunction = (0, https_1.onCall)(async (request) => {
    const { type, role } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    try {
        const templates = await (0, core_1.getTemplates)(type, role);
        return { templates };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener templates: ${error.message}`);
    }
});
// Actualizar template
exports.updateTemplateFunction = (0, https_1.onCall)(async (request) => {
    const { templateId, updates } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!templateId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'templateId y updates son requeridos');
    }
    try {
        await (0, core_1.updateTemplate)(templateId, updates);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al actualizar template: ${error.message}`);
    }
});
// Eliminar template
exports.deleteTemplateFunction = (0, https_1.onCall)(async (request) => {
    const { templateId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!templateId) {
        throw new https_1.HttpsError('invalid-argument', 'templateId es requerido');
    }
    try {
        await (0, core_1.deleteTemplate)(templateId);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al eliminar template: ${error.message}`);
    }
});
// Procesar template con variables
exports.processTemplateFunction = (0, https_1.onCall)(async (request) => {
    const { template, variables } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!template || !variables) {
        throw new https_1.HttpsError('invalid-argument', 'template y variables son requeridos');
    }
    try {
        const result = (0, core_1.processTemplate)(template, variables);
        return { result };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al procesar template: ${error.message}`);
    }
});
// Obtener template por defecto
exports.getDefaultTemplateFunction = (0, https_1.onCall)(async (request) => {
    const { type, role } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!type || !role) {
        throw new https_1.HttpsError('invalid-argument', 'type y role son requeridos');
    }
    try {
        const template = await (0, core_1.getDefaultTemplate)(type, role);
        return { template };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener template por defecto: ${error.message}`);
    }
});
//# sourceMappingURL=templates.js.map