"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAIReport = exports.getSocialMediaReport = exports.getPerformanceReport = exports.getSalesReport = exports.getLeadsReport = void 0;
// Cloud Functions para Reportes
const https_1 = require("firebase-functions/v2/https");
const reports_1 = require("@autodealers/reports");
// Generar reporte de leads
exports.getLeadsReport = (0, https_1.onCall)(async (request) => {
    const { tenantId, filters } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        const report = await (0, reports_1.generateLeadsReport)(tenantId, filters);
        return { report };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al generar reporte de leads: ${error.message}`);
    }
});
// Generar reporte de ventas
exports.getSalesReport = (0, https_1.onCall)(async (request) => {
    const { tenantId, filters } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        const report = await (0, reports_1.generateSalesReport)(tenantId, filters);
        return { report };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al generar reporte de ventas: ${error.message}`);
    }
});
// Generar reporte de rendimiento
exports.getPerformanceReport = (0, https_1.onCall)(async (request) => {
    const { tenantId, sellerId, filters } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !sellerId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y sellerId son requeridos');
    }
    try {
        const report = await (0, reports_1.generatePerformanceReport)(tenantId, sellerId, filters);
        return { report };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al generar reporte de rendimiento: ${error.message}`);
    }
});
// Generar reporte de redes sociales
exports.getSocialMediaReport = (0, https_1.onCall)(async (request) => {
    const { tenantId, filters } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        const reports = await (0, reports_1.generateSocialMediaReport)(tenantId, filters);
        return { reports };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al generar reporte de redes sociales: ${error.message}`);
    }
});
// Generar reporte de IA
exports.getAIReport = (0, https_1.onCall)(async (request) => {
    const { tenantId, filters } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        const report = await (0, reports_1.generateAIReport)(tenantId, filters);
        return { report };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al generar reporte de IA: ${error.message}`);
    }
});
//# sourceMappingURL=reports.js.map