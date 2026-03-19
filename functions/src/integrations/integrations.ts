/**
 * Cloud Functions para Integrations
 * 
 * Funcionalidades:
 * - Gestión de integraciones (WhatsApp, Facebook, Instagram, etc.)
 * - Guardar credenciales
 * - Conectar/desconectar integraciones
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Obtener integraciones del tenant
 */
export const getIntegrations = onCall(async (request) => {
  const { tenantId } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const integrationsSnapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('integrations')
    .get();

  const integrations = integrationsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type,
      status: data.status || 'inactive',
      tenantId,
      credentials: data.credentials ? {
        appId: data.credentials.appId || undefined,
        hasAppSecret: !!data.credentials.appSecret,
      } : undefined,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    };
  });

  return { integrations };
});

/**
 * Guardar credenciales de integración
 */
export const saveIntegrationCredentials = onCall(async (request) => {
  const { tenantId, type, credentials } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !type || !credentials) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const existingSnapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('integrations')
    .where('type', '==', type)
    .get();

  let integrationRef;
  if (!existingSnapshot.empty) {
    integrationRef = existingSnapshot.docs[0].ref;
    await integrationRef.update({
      credentials: {
        ...existingSnapshot.docs[0].data().credentials,
        ...credentials,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    integrationRef = db.collection('tenants').doc(tenantId).collection('integrations').doc();
    await integrationRef.set({
      type,
      status: 'pending',
      credentials,
      settings: {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return {
    success: true,
    integrationId: integrationRef.id,
    message: 'Credenciales guardadas exitosamente',
  };
});

/**
 * Conectar integración
 */
export const connectIntegration = onCall(async (request) => {
  const { tenantId, type, credentials } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !type) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  if (type === 'whatsapp' && credentials) {
    const existingSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('integrations')
      .where('type', '==', 'whatsapp')
      .get();

    let integrationRef;
    if (!existingSnapshot.empty) {
      integrationRef = existingSnapshot.docs[0].ref;
      await integrationRef.update({
        status: 'active',
        credentials,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      integrationRef = db.collection('tenants').doc(tenantId).collection('integrations').doc();
      await integrationRef.set({
        type: 'whatsapp',
        status: 'active',
        credentials,
        settings: {},
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return {
      success: true,
      integrationId: integrationRef.id,
      message: 'WhatsApp conectado exitosamente',
    };
  }

  // Para Facebook e Instagram, retornar URL de OAuth
  if (type === 'facebook' || type === 'instagram') {
    const credentialsDoc = await db.collection('system_settings').doc('credentials').get();
    const credentialsData = credentialsDoc.data();
    const appId = credentialsData?.metaAppId;
    const appSecret = credentialsData?.metaAppSecret;

    if (!appId || !appSecret) {
      throw new HttpsError('failed-precondition', 'Credenciales de Meta no configuradas');
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';
    const redirectUri = `${baseUrl}/api/settings/integrations/callback`;
    const scope = type === 'facebook'
      ? 'pages_manage_posts,pages_read_engagement,pages_messaging,instagram_basic,instagram_content_publish'
      : 'instagram_basic,instagram_content_publish,instagram_manage_messages';

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${type}_${tenantId}`;

    return { authUrl };
  }

  throw new HttpsError('invalid-argument', 'Tipo de integración no válido');
});

/**
 * Desconectar integración
 */
export const disconnectIntegration = onCall(async (request) => {
  const { tenantId, integrationId } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !integrationId) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const integrationRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('integrations')
    .doc(integrationId);

  await integrationRef.update({
    status: 'inactive',
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true, message: 'Integración desconectada exitosamente' };
});


