// Cloud Functions para Templates
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { createTemplate, getTemplateById, getTemplates, updateTemplate, deleteTemplate, processTemplate, getDefaultTemplate } from '@autodealers/core';

const db = getFirestore();

// Crear template
export const createTemplateFunction = onCall(async (request) => {
  const { template, tenantId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!template) {
    throw new HttpsError('invalid-argument', 'template es requerido');
  }

  try {
    const newTemplate = await createTemplate(template, tenantId);
    return { template: newTemplate };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear template: ${error.message}`);
  }
});

// Obtener template por ID
export const getTemplateByIdFunction = onCall(async (request) => {
  const { templateId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!templateId) {
    throw new HttpsError('invalid-argument', 'templateId es requerido');
  }

  try {
    const template = await getTemplateById(templateId);
    if (!template) {
      throw new HttpsError('not-found', 'Template no encontrado');
    }
    return { template };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al obtener template: ${error.message}`);
  }
});

// Obtener templates
export const getTemplatesFunction = onCall(async (request) => {
  const { type, role } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  try {
    const templates = await getTemplates(type, role);
    return { templates };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener templates: ${error.message}`);
  }
});

// Actualizar template
export const updateTemplateFunction = onCall(async (request) => {
  const { templateId, updates } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!templateId || !updates) {
    throw new HttpsError('invalid-argument', 'templateId y updates son requeridos');
  }

  try {
    await updateTemplate(templateId, updates);
    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al actualizar template: ${error.message}`);
  }
});

// Eliminar template
export const deleteTemplateFunction = onCall(async (request) => {
  const { templateId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!templateId) {
    throw new HttpsError('invalid-argument', 'templateId es requerido');
  }

  try {
    await deleteTemplate(templateId);
    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al eliminar template: ${error.message}`);
  }
});

// Procesar template con variables
export const processTemplateFunction = onCall(async (request) => {
  const { template, variables } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!template || !variables) {
    throw new HttpsError('invalid-argument', 'template y variables son requeridos');
  }

  try {
    const result = processTemplate(template, variables);
    return { result };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al procesar template: ${error.message}`);
  }
});

// Obtener template por defecto
export const getDefaultTemplateFunction = onCall(async (request) => {
  const { type, role } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!type || !role) {
    throw new HttpsError('invalid-argument', 'type y role son requeridos');
  }

  try {
    const template = await getDefaultTemplate(type, role);
    return { template };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener template por defecto: ${error.message}`);
  }
});


