// Cloud Functions para Announcements
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { createNotification } from '@autodealers/core';

const db = getFirestore();

// Crear anuncio
export const createAnnouncement = onCall(async (request) => {
  const { tenantId, announcement, sendNotifications } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !announcement) {
    throw new HttpsError('invalid-argument', 'tenantId y announcement son requeridos');
  }

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('announcements')
      .doc();

    await docRef.set({
      ...announcement,
      isActive: true,
      dismissedBy: [],
      createdBy: auth.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Enviar notificaciones si se solicita
    if (sendNotifications !== false) {
      await sendAnnouncementNotifications(docRef.id, tenantId, announcement);
    }

    return { id: docRef.id };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear anuncio: ${error.message}`);
  }
});

// Obtener anuncios
export const getAnnouncements = onCall(async (request) => {
  const { tenantId, activeOnly } = request.data;
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
      .collection('announcements')
      .orderBy('createdAt', 'desc') as any;

    if (activeOnly) {
      query = query.where('isActive', '==', true);
    }

    const snapshot = await query.limit(100).get();
    const announcements = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate(),
        endDate: data.endDate?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      };
    });

    return { announcements };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener anuncios: ${error.message}`);
  }
});

// Obtener anuncios activos
export const getActiveAnnouncements = onCall(async (request) => {
  const { tenantId, userId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    const now = new Date();
    const snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('announcements')
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const announcements = snapshot.docs
      .map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate(),
          endDate: data.endDate?.toDate(),
          createdAt: data.createdAt?.toDate(),
        };
      })
      .filter((announcement: any) => {
        // Filtrar por fecha si aplica
        if (announcement.startDate && announcement.startDate > now) return false;
        if (announcement.endDate && announcement.endDate < now) return false;

        // Filtrar por destinatarios
        if (announcement.targetType === 'selected' && announcement.targetUserIds) {
          if (!announcement.targetUserIds.includes(userId || auth.uid)) return false;
        }

        // Filtrar los que ya fueron descartados
        if (announcement.dismissedBy?.includes(userId || auth.uid)) return false;

        return true;
      });

    return { announcements };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener anuncios activos: ${error.message}`);
  }
});

// Descartar anuncio
export const dismissAnnouncement = onCall(async (request) => {
  const { tenantId, announcementId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !announcementId) {
    throw new HttpsError('invalid-argument', 'tenantId y announcementId son requeridos');
  }

  try {
    const announcementRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('announcements')
      .doc(announcementId);

    const announcementDoc = await announcementRef.get();
    if (!announcementDoc.exists) {
      throw new HttpsError('not-found', 'Anuncio no encontrado');
    }

    const dismissedBy = announcementDoc.data()?.dismissedBy || [];
    if (!dismissedBy.includes(auth.uid)) {
      dismissedBy.push(auth.uid);
      await announcementRef.update({
        dismissedBy,
        updatedAt: new Date(),
      });
    }

    return { success: true };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al descartar anuncio: ${error.message}`);
  }
});

// Actualizar anuncio
export const updateAnnouncement = onCall(async (request) => {
  const { tenantId, announcementId, updates } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !announcementId || !updates) {
    throw new HttpsError('invalid-argument', 'tenantId, announcementId y updates son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('announcements')
      .doc(announcementId)
      .update({
        ...updates,
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al actualizar anuncio: ${error.message}`);
  }
});

// Eliminar anuncio
export const deleteAnnouncement = onCall(async (request) => {
  const { tenantId, announcementId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !announcementId) {
    throw new HttpsError('invalid-argument', 'tenantId y announcementId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('announcements')
      .doc(announcementId)
      .delete();

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al eliminar anuncio: ${error.message}`);
  }
});

// Helper para enviar notificaciones
async function sendAnnouncementNotifications(
  announcementId: string,
  tenantId: string,
  announcement: any
): Promise<void> {
  let userIds: string[] = [];

  if (announcement.targetType === 'all') {
    const usersSnapshot = await db
      .collection('users')
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'active')
      .get();

    userIds = usersSnapshot.docs.map((doc) => doc.id);
  } else if (announcement.targetType === 'selected' && announcement.targetUserIds) {
    userIds = announcement.targetUserIds;
  }

  userIds = Array.from(new Set(userIds));

  for (const userId of userIds) {
    try {
      await createNotification({
        tenantId,
        userId,
        type: 'announcement' as any,
        title: announcement.title,
        message: announcement.content?.substring(0, 200) || '',
        channels: ['system'],
        metadata: {
          announcementId,
          contentType: announcement.contentType,
          mediaUrl: announcement.mediaUrl,
          priority: announcement.priority,
        },
      });
    } catch (error) {
      console.warn(`Error sending notification to user ${userId}:`, error);
    }
  }
}


