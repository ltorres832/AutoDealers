// Cloud Functions para Social Media
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { FacebookMessengerService } from '@autodealers/messaging';
import { InstagramMessagingService } from '@autodealers/messaging';

const db = getFirestore();

// Publicar en Facebook
export const publishToFacebook = onCall(async (request) => {
  const { tenantId, post } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !post) {
    throw new HttpsError('invalid-argument', 'tenantId y post son requeridos');
  }

  try {
    // Obtener credenciales de Facebook del tenant
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      throw new HttpsError('not-found', 'Tenant no encontrado');
    }

    const tenantData = tenantDoc.data();
    const facebookConfig = tenantData?.settings?.facebook || {};
    const accessToken = facebookConfig.accessToken || process.env.FACEBOOK_ACCESS_TOKEN || '';
    const pageId = facebookConfig.pageId || '';

    if (!accessToken || !pageId) {
      throw new HttpsError('failed-precondition', 'Credenciales de Facebook no configuradas');
    }

    const facebookService = new FacebookMessengerService(accessToken, pageId);
    const result = await facebookService.publishPost(post);

    // Guardar en Firestore
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('social_posts')
      .add({
        ...post,
        platform: 'facebook',
        status: 'published',
        publishedAt: new Date(),
        externalId: result.id,
        createdAt: new Date(),
      });

    return { success: true, postId: result.id };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al publicar en Facebook: ${error.message}`);
  }
});

// Publicar en Instagram
export const publishToInstagram = onCall(async (request) => {
  const { tenantId, post } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !post) {
    throw new HttpsError('invalid-argument', 'tenantId y post son requeridos');
  }

  try {
    // Obtener credenciales de Instagram del tenant
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      throw new HttpsError('not-found', 'Tenant no encontrado');
    }

    const tenantData = tenantDoc.data();
    const instagramConfig = tenantData?.settings?.instagram || {};
    const accessToken = instagramConfig.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN || '';
    const accountId = instagramConfig.accountId || '';

    if (!accessToken || !accountId) {
      throw new HttpsError('failed-precondition', 'Credenciales de Instagram no configuradas');
    }

    const instagramService = new InstagramMessagingService(accessToken, accountId);
    const result = await instagramService.publishPost(post);

    // Guardar en Firestore
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('social_posts')
      .add({
        ...post,
        platform: 'instagram',
        status: 'published',
        publishedAt: new Date(),
        externalId: result.id,
        createdAt: new Date(),
      });

    return { success: true, postId: result.id };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al publicar en Instagram: ${error.message}`);
  }
});

// Programar post
export const schedulePost = onCall(async (request) => {
  const { tenantId, post, scheduledAt } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !post || !scheduledAt) {
    throw new HttpsError('invalid-argument', 'tenantId, post y scheduledAt son requeridos');
  }

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('social_posts')
      .doc();

    await docRef.set({
      ...post,
      status: 'scheduled',
      scheduledAt: new Date(scheduledAt),
      createdAt: new Date(),
    });

    return { id: docRef.id };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al programar post: ${error.message}`);
  }
});

// Obtener posts
export const getSocialPosts = onCall(async (request) => {
  const { tenantId, status, platform, limit } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    let query = db
      .collection('tenants')
      .doc(tenantId)
      .collection('social_posts') as any;

    if (status) {
      query = query.where('status', '==', status);
    }
    if (platform) {
      query = query.where('platform', '==', platform);
    }

    query = query.orderBy('createdAt', 'desc').limit(limit || 100);

    const snapshot = await query.get();
    const posts = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { posts };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener posts: ${error.message}`);
  }
});

// Pausar post programado
export const pauseScheduledPost = onCall(async (request) => {
  const { tenantId, postId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !postId) {
    throw new HttpsError('invalid-argument', 'tenantId y postId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('social_posts')
      .doc(postId)
      .update({
        status: 'paused',
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al pausar post: ${error.message}`);
  }
});


