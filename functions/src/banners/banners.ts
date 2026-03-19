// Cloud Functions para Banners
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Crear/solicitar banner premium
export const createBanner = onCall(async (request) => {
  const { tenantId, banner } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !banner) {
    throw new HttpsError('invalid-argument', 'tenantId y banner son requeridos');
  }

  try {
    // Verificar límite global (4 banners activos máximo)
    const activeBannersSnapshot = await db
      .collectionGroup('premium_banners')
      .where('status', '==', 'active')
      .where('approved', '==', true)
      .get();

    if (activeBannersSnapshot.size >= 4) {
      throw new HttpsError('resource-exhausted', 'Límite de banners activos alcanzado');
    }

    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('premium_banners')
      .doc();

    await docRef.set({
      ...banner,
      status: 'pending',
      approved: false,
      views: 0,
      clicks: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { id: docRef.id };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al crear banner: ${error.message}`);
  }
});

// Obtener banners
export const getBanners = onCall(async (request) => {
  const { tenantId, status, approved } = request.data;
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
      .collection('premium_banners') as any;

    if (status) {
      query = query.where('status', '==', status);
    }
    if (approved !== undefined) {
      query = query.where('approved', '==', approved);
    }

    query = query.orderBy('createdAt', 'desc').limit(100);

    const snapshot = await query.get();
    const banners = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      expiresAt: doc.data().expiresAt?.toDate(),
    }));

    return { banners };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener banners: ${error.message}`);
  }
});

// Obtener banners públicos (para web pública)
export const getPublicBanners = onCall(async (request) => {
  try {
    const snapshot = await db
      .collectionGroup('premium_banners')
      .where('status', '==', 'active')
      .where('approved', '==', true)
      .orderBy('priority', 'desc')
      .limit(4)
      .get();

    const banners = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      const pathParts = doc.ref.path.split('/');
      const tenantId = pathParts[1];

      return {
        id: doc.id,
        tenantId,
        ...data,
        createdAt: data.createdAt?.toDate(),
        expiresAt: data.expiresAt?.toDate(),
      };
    });

    return { banners };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener banners públicos: ${error.message}`);
  }
});

// Aprobar banner (admin)
export const approveBanner = onCall(async (request) => {
  const { tenantId, bannerId } = request.data;
  const auth = request.auth;

  if (!auth || auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores');
  }

  if (!tenantId || !bannerId) {
    throw new HttpsError('invalid-argument', 'tenantId y bannerId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('premium_banners')
      .doc(bannerId)
      .update({
        approved: true,
        approvedAt: new Date(),
        approvedBy: auth.uid,
        status: 'active',
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al aprobar banner: ${error.message}`);
  }
});

// Rechazar banner (admin)
export const rejectBanner = onCall(async (request) => {
  const { tenantId, bannerId, reason } = request.data;
  const auth = request.auth;

  if (!auth || auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores');
  }

  if (!tenantId || !bannerId) {
    throw new HttpsError('invalid-argument', 'tenantId y bannerId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('premium_banners')
      .doc(bannerId)
      .update({
        approved: false,
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: new Date(),
        rejectedBy: auth.uid,
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al rechazar banner: ${error.message}`);
  }
});

// Registrar click en banner
export const recordBannerClick = onCall(async (request) => {
  const { tenantId, bannerId } = request.data;

  if (!tenantId || !bannerId) {
    throw new HttpsError('invalid-argument', 'tenantId y bannerId son requeridos');
  }

  try {
    const bannerRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('premium_banners')
      .doc(bannerId);

    await bannerRef.update({
      clicks: db.FieldValue.increment(1),
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al registrar click: ${error.message}`);
  }
});


