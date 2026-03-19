// Cloud Functions para Reportes
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { generateLeadsReport, generateSalesReport, generatePerformanceReport, generateSocialMediaReport, generateAIReport } from '@autodealers/reports';

// Generar reporte de leads
export const getLeadsReport = onCall(async (request) => {
  const { tenantId, filters } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    const report = await generateLeadsReport(tenantId, filters);
    return { report };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al generar reporte de leads: ${error.message}`);
  }
});

// Generar reporte de ventas
export const getSalesReport = onCall(async (request) => {
  const { tenantId, filters } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    const report = await generateSalesReport(tenantId, filters);
    return { report };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al generar reporte de ventas: ${error.message}`);
  }
});

// Generar reporte de rendimiento
export const getPerformanceReport = onCall(async (request) => {
  const { tenantId, sellerId, filters } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !sellerId) {
    throw new HttpsError('invalid-argument', 'tenantId y sellerId son requeridos');
  }

  try {
    const report = await generatePerformanceReport(tenantId, sellerId, filters);
    return { report };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al generar reporte de rendimiento: ${error.message}`);
  }
});

// Generar reporte de redes sociales
export const getSocialMediaReport = onCall(async (request) => {
  const { tenantId, filters } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    const reports = await generateSocialMediaReport(tenantId, filters);
    return { reports };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al generar reporte de redes sociales: ${error.message}`);
  }
});

// Generar reporte de IA
export const getAIReport = onCall(async (request) => {
  const { tenantId, filters } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    const report = await generateAIReport(tenantId, filters);
    return { report };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al generar reporte de IA: ${error.message}`);
  }
});


